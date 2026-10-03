import type { Dataset } from './types';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** 出典として認めないドメイン(切り抜き・まとめ・匿名掲示板など)。運用に合わせて追加する */
export const BLOCKED_SOURCE_HOSTS = ['5ch.net', '2ch.sc', 'matome.naver.jp'];

/** データの整合性を検査し、問題点の一覧を返す(空なら OK) */
export function validateDataset(d: Dataset): string[] {
  const errors: string[] = [];
  const ids = (label: string, list: { id: string }[]) => {
    const set = new Set<string>();
    for (const x of list) {
      if (set.has(x.id)) errors.push(`${label}: ID が重複しています: ${x.id}`);
      set.add(x.id);
    }
    return set;
  };
  const persons = ids('人物', d.persons);
  const orgs = ids('組織', d.orgs);
  const sources = ids('出典', d.sources);
  ids('関係', d.relations);
  ids('イベント', d.events);

  const checkDate = (where: string, v: string | undefined) => {
    if (v !== undefined && !DATE.test(v)) errors.push(`${where}: 日付の形式が不正です: ${v}`);
  };
  const checkSources = (where: string, list: string[]) => {
    if (!list.length) errors.push(`${where}: 出典が1件もありません(出典は必須)`);
    for (const s of list) if (!sources.has(s)) errors.push(`${where}: 存在しない出典 ${s}`);
  };

  for (const p of d.persons) {
    checkDate(`人物 ${p.id}`, p.debut);
    if (!p.links.length) errors.push(`人物 ${p.id}: 公式チャンネル・SNSのURLがありません(掲載基準)`);
  }
  for (const o of d.orgs) {
    if (o.parent && !orgs.has(o.parent)) errors.push(`組織 ${o.id}: 親組織 ${o.parent} が存在しません`);
  }
  for (const m of d.memberships) {
    const where = `所属 ${m.personId}@${m.orgId}`;
    if (!persons.has(m.personId)) errors.push(`${where}: 人物が存在しません`);
    if (!orgs.has(m.orgId)) errors.push(`${where}: 組織が存在しません`);
    checkDate(where, m.start);
    checkDate(where, m.end);
    checkSources(where, m.sourceIds);
  }
  for (const r of d.relations) {
    const where = `関係 ${r.id}`;
    for (const pid of [r.a, r.b]) if (!persons.has(pid)) errors.push(`${where}: 人物 ${pid} が存在しません`);
    if (r.a === r.b) errors.push(`${where}: 同じ人物同士の関係です`);
    checkDate(where, r.start);
    checkDate(where, r.end);
    checkSources(where, r.sourceIds);
  }
  for (const e of d.events) {
    const where = `イベント ${e.id}`;
    checkDate(where, e.date);
    if (e.participants.length < 2) errors.push(`${where}: 参加者が2人未満です`);
    for (const pid of e.participants) if (!persons.has(pid)) errors.push(`${where}: 人物 ${pid} が存在しません`);
    if (new Set(e.participants).size !== e.participants.length) errors.push(`${where}: 参加者が重複しています`);
    if (e.host && !persons.has(e.host) && !orgs.has(e.host)) errors.push(`${where}: 主催 ${e.host} が存在しません`);
    for (const t of e.teams ?? [])
      for (const pid of t.members)
        if (!e.participants.includes(pid)) errors.push(`${where}: チーム ${t.name} のメンバー ${pid} が参加者にいません`);
    checkSources(where, e.sourceIds);
  }
  for (const s of d.sources) {
    checkDate(`出典 ${s.id}`, s.retrieved);
    let host = '';
    try {
      host = new URL(s.url).hostname;
    } catch {
      errors.push(`出典 ${s.id}: URL が不正です: ${s.url}`);
      continue;
    }
    if (BLOCKED_SOURCE_HOSTS.some((h) => host === h || host.endsWith('.' + h)))
      errors.push(`出典 ${s.id}: 出典として認めていないサイトです: ${host}`);
  }
  return errors;
}
