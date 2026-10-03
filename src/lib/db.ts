import type {
  Dataset,
  Membership,
  Org,
  Person,
  Relation,
  RelationCategory,
  Source,
  StreamEvent,
} from './types';
import { normalize } from './text';

export type Period = '3m' | '1y' | 'all';

export const PERIOD_LABELS: Record<Period, string> = {
  '3m': '直近3か月',
  '1y': '直近1年',
  all: '全期間',
};

/** 中心人物から見た、相手1人ぶんの関係の集計結果 */
export interface NeighborEdge {
  other: Person;
  categories: Set<RelationCategory>;
  /** 共演(コラボ配信・歌/動画)イベント。期間で絞り込み済み */
  collabEvents: StreamEvent[];
  /** 企画・大会イベント。期間で絞り込み済み */
  projectEvents: StreamEvent[];
  /** 制作・公言された関係 */
  relations: Relation[];
  /** 同時期に所属していた組織 */
  sharedOrgs: Org[];
  /** 期間内の共演+企画の回数(線の太さに使う) */
  count: number;
  first?: string;
  last?: string;
}

export interface PathStep {
  from: string;
  to: string;
  event: StreamEvent;
}

const COLLAB_KINDS = new Set(['collab', 'song']);
const PROJECT_KINDS = new Set(['project', 'tournament', 'live']);

export function periodStart(period: Period, today: Date): string | undefined {
  if (period === 'all') return undefined;
  const d = new Date(today);
  if (period === '3m') d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function overlaps(a: Membership, b: Membership): boolean {
  const aStart = a.start ?? '0000';
  const bStart = b.start ?? '0000';
  const aEnd = a.end ?? '9999';
  const bEnd = b.end ?? '9999';
  return aStart <= bEnd && bStart <= aEnd;
}

export class Db {
  readonly data: Dataset;
  private personMap = new Map<string, Person>();
  private orgMap = new Map<string, Org>();
  private sourceMap = new Map<string, Source>();
  private eventMap = new Map<string, StreamEvent>();
  private eventsByPerson = new Map<string, StreamEvent[]>();
  private membershipsByPerson = new Map<string, Membership[]>();
  private relationsByPerson = new Map<string, Relation[]>();

  constructor(data: Dataset) {
    this.data = data;
    for (const p of data.persons) this.personMap.set(p.id, p);
    for (const o of data.orgs) this.orgMap.set(o.id, o);
    for (const s of data.sources) this.sourceMap.set(s.id, s);
    for (const e of data.events) {
      this.eventMap.set(e.id, e);
      for (const pid of e.participants) push(this.eventsByPerson, pid, e);
    }
    for (const m of data.memberships) push(this.membershipsByPerson, m.personId, m);
    for (const r of data.relations) {
      push(this.relationsByPerson, r.a, r);
      push(this.relationsByPerson, r.b, r);
    }
  }

  person(id: string): Person | undefined {
    return this.personMap.get(id);
  }
  org(id: string): Org | undefined {
    return this.orgMap.get(id);
  }
  source(id: string): Source | undefined {
    return this.sourceMap.get(id);
  }
  event(id: string): StreamEvent | undefined {
    return this.eventMap.get(id);
  }

  /** 関係情報を表示してよい人物か(引退後に非公開を求めた人物は除く) */
  isRelationPublic(id: string): boolean {
    const p = this.personMap.get(id);
    return !!p && p.visibility !== 'basic-only';
  }

  /** 公開してよい参加者のみ返す */
  visibleParticipants(e: StreamEvent): { visible: Person[]; hiddenCount: number } {
    const visible: Person[] = [];
    let hiddenCount = 0;
    for (const id of e.participants) {
      const p = this.personMap.get(id);
      if (p && this.isRelationPublic(id)) visible.push(p);
      else hiddenCount++;
    }
    return { visible, hiddenCount };
  }

  membershipsOf(personId: string): Membership[] {
    return this.membershipsByPerson.get(personId) ?? [];
  }

  membersOf(orgId: string): Membership[] {
    return this.data.memberships.filter((m) => m.orgId === orgId);
  }

  eventsOf(personId: string): StreamEvent[] {
    return this.eventsByPerson.get(personId) ?? [];
  }

  eventsHostedBy(id: string): StreamEvent[] {
    return this.data.events.filter((e) => e.host === id);
  }

  /** 名前・読み・別名(旧名)で検索。前方一致を優先する */
  search(query: string, limit = 10): Person[] {
    const q = normalize(query);
    if (!q) return [];
    const scored: { p: Person; score: number }[] = [];
    for (const p of this.data.persons) {
      const keys = [p.name, p.kana, ...p.aliases, p.id].map(normalize);
      let score = 0;
      for (const k of keys) {
        if (k === q) score = Math.max(score, 3);
        else if (k.startsWith(q)) score = Math.max(score, 2);
        else if (k.includes(q)) score = Math.max(score, 1);
      }
      if (score > 0) scored.push({ p, score });
    }
    scored.sort((a, b) => b.score - a.score || a.p.kana.localeCompare(b.p.kana, 'ja'));
    return scored.slice(0, limit).map((s) => s.p);
  }

  /**
   * 中心人物の1ホップ先の関係をすべて集計する。
   * 共演回数はイベントから毎回集計するため、数値と出典が常に一致する。
   */
  neighbors(
    centerId: string,
    period: Period = 'all',
    today: Date = new Date(),
    includeAgencyMates = false,
  ): NeighborEdge[] {
    if (!this.isRelationPublic(centerId)) return [];
    const since = periodStart(period, today);
    const edges = new Map<string, NeighborEdge>();
    const edgeFor = (otherId: string): NeighborEdge | undefined => {
      if (otherId === centerId || !this.isRelationPublic(otherId)) return undefined;
      let e = edges.get(otherId);
      if (!e) {
        e = {
          other: this.personMap.get(otherId)!,
          categories: new Set(),
          collabEvents: [],
          projectEvents: [],
          relations: [],
          sharedOrgs: [],
          count: 0,
        };
        edges.set(otherId, e);
      }
      return e;
    };

    for (const ev of this.eventsOf(centerId)) {
      if (since && ev.date < since) continue;
      const isCollab = COLLAB_KINDS.has(ev.kind);
      for (const pid of coParticipants(ev, centerId)) {
        const e = edgeFor(pid);
        if (!e) continue;
        if (isCollab) {
          e.collabEvents.push(ev);
          e.categories.add('collab');
        } else if (PROJECT_KINDS.has(ev.kind)) {
          e.projectEvents.push(ev);
          e.categories.add('project');
        }
        e.count++;
        if (!e.first || ev.date < e.first) e.first = ev.date;
        if (!e.last || ev.date > e.last) e.last = ev.date;
      }
    }

    for (const r of this.relationsByPerson.get(centerId) ?? []) {
      const e = edgeFor(r.a === centerId ? r.b : r.a);
      if (!e) continue;
      e.relations.push(r);
      e.categories.add(r.type);
    }

    // 所属: ユニット・チーム・グループの共有と、事務所の同期(同じ期生)を「公式所属」の関係とみなす。
    // 大きな事務所では全員が同僚になり図が埋まってしまうため、事務所が同じだけの相手は
    // includeAgencyMates のときか、他の関係がある場合にだけ所属組織を添える。
    for (const m of this.membershipsOf(centerId)) {
      const org = this.orgMap.get(m.orgId)!;
      for (const other of this.membersOf(m.orgId)) {
        if (other.personId === centerId || !overlaps(m, other)) continue;
        const strong = org.kind !== 'agency' || (!!m.role && m.role === other.role);
        if (!strong && !includeAgencyMates && !edges.has(other.personId)) continue;
        const e = edgeFor(other.personId);
        if (!e) continue;
        if (!e.sharedOrgs.includes(org)) e.sharedOrgs.push(org);
        if (strong || includeAgencyMates) e.categories.add('affiliation');
      }
    }

    return [...edges.values()].sort(
      (a, b) =>
        b.count - a.count ||
        (b.last ?? '').localeCompare(a.last ?? '') ||
        a.other.kana.localeCompare(b.other.kana, 'ja'),
    );
  }

  /** 2人の関係(全期間) */
  pair(aId: string, bId: string): NeighborEdge | undefined {
    return this.neighbors(aId, 'all', new Date(), true).find((e) => e.other.id === bId);
  }

  /** 2人の両方と共演・企画で一緒になったことのある人物 */
  commonCollaborators(aId: string, bId: string): { person: Person; countA: number; countB: number }[] {
    const coStar = (id: string) =>
      new Map(
        this.neighbors(id, 'all')
          .filter((e) => e.count > 0)
          .map((e) => [e.other.id, e.count] as const),
      );
    const a = coStar(aId);
    const b = coStar(bId);
    const result: { person: Person; countA: number; countB: number }[] = [];
    for (const [id, countA] of a) {
      if (id === bId) continue;
      const countB = b.get(id);
      if (countB) result.push({ person: this.personMap.get(id)!, countA, countB });
    }
    return result.sort((x, y) => y.countA + y.countB - (x.countA + x.countB));
  }

  /** 2人をつなぐ最短の共演の連なり(幅優先探索)。見つからなければ undefined */
  shortestPath(fromId: string, toId: string): PathStep[] | undefined {
    if (!this.isRelationPublic(fromId) || !this.isRelationPublic(toId)) return undefined;
    if (fromId === toId) return [];
    const prev = new Map<string, { id: string; event: StreamEvent }>();
    const visited = new Set([fromId]);
    const queue = [fromId];
    while (queue.length) {
      const cur = queue.shift()!;
      // 新しい共演を優先して経路に使う
      const evs = [...this.eventsOf(cur)].sort((a, b) => b.date.localeCompare(a.date));
      for (const ev of evs) {
        for (const pid of coParticipants(ev, cur)) {
          if (visited.has(pid) || !this.isRelationPublic(pid)) continue;
          visited.add(pid);
          prev.set(pid, { id: cur, event: ev });
          if (pid === toId) {
            const steps: PathStep[] = [];
            let node = toId;
            while (node !== fromId) {
              const p = prev.get(node)!;
              steps.unshift({ from: p.id, to: node, event: p.event });
              node = p.id;
            }
            return steps;
          }
          queue.push(pid);
        }
      }
    }
    return undefined;
  }

  /** 同じ事務所に同時期に所属する(している)人数。関係図には出さず件数だけ示す */
  agencyMates(personId: string, today: Date = new Date()): { org: Org; count: number }[] {
    const t = today.toISOString().slice(0, 10);
    return this.membershipsOf(personId)
      .filter((m) => this.orgMap.get(m.orgId)?.kind === 'agency' && (!m.end || m.end >= t))
      .map((m) => ({
        org: this.orgMap.get(m.orgId)!,
        count: this.membersOf(m.orgId).filter(
          (o) => o.personId !== personId && (!o.end || o.end >= t) && this.isRelationPublic(o.personId),
        ).length,
      }));
  }

  /** 現在の主な所属事務所(関係図の枠に使う) */
  primaryAgency(personId: string, today: Date = new Date()): Org | undefined {
    const t = today.toISOString().slice(0, 10);
    const m = this.membershipsOf(personId).find(
      (m) => this.orgMap.get(m.orgId)?.kind === 'agency' && (!m.end || m.end >= t),
    );
    return m ? this.orgMap.get(m.orgId) : undefined;
  }

  recentEvents(limit = 6): StreamEvent[] {
    return [...this.data.events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }
}

/**
 * イベントで「一緒に出た」とみなす相手。
 * チーム分けのある大会では、同じ大会に出ただけでは共演とせず、同じチームのメンバーだけを数える。
 */
export function coParticipants(ev: StreamEvent, personId: string): string[] {
  const team = ev.teams?.find((t) => t.members.includes(personId));
  return team ? team.members : ev.participants;
}

/** 2人が同じチームだったときのチーム名 */
export function sharedTeam(ev: StreamEvent, a: string, b: string): string | undefined {
  return ev.teams?.find((t) => t.members.includes(a) && t.members.includes(b))?.name;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}
