import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import type { ElementDefinition } from 'cytoscape';
import type { NeighborEdge } from '../lib/db';
import { db } from '../lib/store';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/labels';
import type { Person, RelationCategory } from '../lib/types';
import { formatDate } from '../lib/format';

interface Props {
  center: Person;
  edges: NeighborEdge[];
  onSelect: (personId: string) => void;
}

interface Tip {
  x: number;
  y: number;
  lines: string[];
}

const KIND_FILL: Record<Person['kind'], string> = {
  vtuber: '#5b8def',
  streamer: '#35a77c',
  creator: '#b07ad8',
};

function edgeWidth(count: number): number {
  return Math.min(2 + count * 1.5, 14);
}

/** 根拠の件数(共演イベント・関係それぞれの出典の合計) */
function evidenceCount(e: NeighborEdge, cat: RelationCategory): number {
  if (cat === 'collab') return e.collabEvents.reduce((n, ev) => n + ev.sourceIds.length, 0);
  if (cat === 'project') return e.projectEvents.reduce((n, ev) => n + ev.sourceIds.length, 0);
  return e.relations.filter((r) => r.type === cat).reduce((n, r) => n + r.sourceIds.length, 0);
}

function buildElements(center: Person, edges: NeighborEdge[], vertical: boolean): ElementDefinition[] {
  const els: ElementDefinition[] = [];
  const centerAgency = db.primaryAgency(center.id);
  const frames = new Map<string, string>();
  const frameFor = (personId: string): string | undefined => {
    const org = db.primaryAgency(personId);
    if (!org) return undefined;
    // 中心人物と同じ事務所、または2人以上が属する事務所だけ枠で囲む
    const sameCount = [center, ...edges.map((e) => e.other)].filter((p) => db.primaryAgency(p.id)?.id === org.id).length;
    if (org.id !== centerAgency?.id && sameCount < 2) return undefined;
    frames.set(org.id, org.name);
    return `org:${org.id}`;
  };

  const people = [center, ...edges.map((e) => e.other)];
  const parents = new Map(people.map((p) => [p.id, frameFor(p.id)]));
  for (const [id, name] of frames) els.push({ data: { id: `org:${id}`, label: name }, classes: 'org' });

  const positions = layoutPositions(center.id, edges, parents);
  // 人数が少ないときは間隔を詰めて、全体を大きく表示する
  const scale = Math.min(1, 0.55 + edges.length * 0.025);
  for (const [id, p] of positions) positions.set(id, { x: p.x * scale, y: p.y * scale });
  // 縦長の画面(スマートフォン)では、左右に広がる配置を上下に入れ替えて大きく表示する
  if (vertical) for (const [id, p] of positions) positions.set(id, { x: p.y * 0.6, y: p.x * 1.35 });
  for (const p of people) {
    els.push({
      data: { id: p.id, label: p.name, parent: parents.get(p.id), fill: KIND_FILL[p.kind] },
      position: positions.get(p.id),
      classes: p.id === center.id ? 'center' : p.status === 'retired' ? 'retired' : '',
    });
  }

  for (const e of edges) {
    const cats: RelationCategory[] = [];
    if (e.collabEvents.length) cats.push('collab');
    if (e.projectEvents.length) cats.push('project');
    for (const r of e.relations) if (!cats.includes(r.type)) cats.push(r.type);
    // 所属だけの関係は、同じ枠に入っていなければ細い線で結ぶ
    if (!cats.length && parents.get(e.other.id) !== parents.get(center.id)) cats.push('affiliation');

    for (const cat of cats) {
      const rel = e.relations.find((r) => r.type === cat);
      const count = cat === 'collab' ? e.collabEvents.length : cat === 'project' ? e.projectEvents.length : 0;
      const source = rel?.directed ? rel.a : center.id;
      const target = rel?.directed ? rel.b : e.other.id;
      const lines = [`${center.name} — ${e.other.name}`, CATEGORY_LABELS[cat]];
      if (count) lines.push(`${count}回 / 直近 ${formatDate(lastOf(e, cat))}`);
      if (rel) lines.push(e.relations.filter((r) => r.type === cat).map((r) => r.label).join('、'));
      if (cat !== 'affiliation') lines.push(`根拠 ${evidenceCount(e, cat)}件`);
      els.push({
        data: {
          id: `${e.other.id}:${cat}`,
          source,
          target,
          color: CATEGORY_COLORS[cat],
          width: count ? edgeWidth(count) : 1.5,
          label: cat === 'declared' ? rel?.label ?? '' : '',
          tip: lines,
        },
        classes: `${cat}${rel?.directed ? ' directed' : ''}`,
      });
    }
  }
  return els;
}

/**
 * 中心人物を原点に置き、扇状に並べる。
 * - 中心人物と同じ枠(事務所)の人: 左側
 * - 別の枠の人: 右側。中心から離して、自分の枠と重ならないようにする
 * - 枠を持たない人(卒業者・個人勢など): 右下
 * 自動レイアウトでは枠の外の人が枠の中に入り込み「所属している」ように見えるため使わない。
 */
function layoutPositions(centerId: string, edges: NeighborEdge[], parents: Map<string, string | undefined>) {
  const pos = new Map<string, { x: number; y: number }>([[centerId, { x: 0, y: 0 }]]);
  const own = parents.get(centerId);
  const groups = new Map<string, NeighborEdge[]>();
  for (const e of edges) {
    const key = parents.get(e.other.id) ?? '';
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  const place = (list: NeighborEdge[], from: number, to: number, base: number) => {
    // 人数が多いときは複数の輪に交互に置いて、ラベルの重なりを減らす
    const rings = list.length > 10 ? 3 : list.length > 6 ? 2 : 1;
    list.forEach((e, i) => {
      const t = list.length === 1 ? 0.5 : i / (list.length - 1);
      const angle = ((from + (to - from) * t) * Math.PI) / 180;
      const r = base + ((i % rings) - (rings - 1) / 2) * 70;
      pos.set(e.other.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    });
  };
  /** 角度の範囲を、人数に比例してグループごとに分ける */
  const spread = (list: NeighborEdge[][], from: number, to: number, base: (i: number) => number) => {
    const total = list.reduce((n, l) => n + l.length, 0);
    const gap = list.length > 1 ? 14 : 0;
    const usable = to - from - gap * (list.length - 1);
    let cursor = from;
    list.forEach((l, i) => {
      const width = (usable * l.length) / Math.max(total, 1);
      place(l, cursor, cursor + width, base(i));
      cursor += width + gap;
    });
  };

  const loose = groups.get('') ?? [];
  const others = [...groups].filter(([k]) => k !== '' && k !== own).map(([, l]) => l);
  if (!own) {
    // 中心人物に枠がない場合は全周を使う(枠を持たない人は内側の輪)
    const list = [...others, ...(loose.length ? [loose] : [])];
    spread(list, -150, 150, (i) => (i < others.length ? 300 : 210));
    return pos;
  }
  const ownList = groups.get(own) ?? [];
  if (ownList.length) place(ownList, 115, 245, 210);
  if (others.length) spread(others, -60, 50, () => 330);
  // 枠を持たない人は、どの枠にも入らないよう真下の外側に置く
  if (loose.length) {
    if (ownList.length || others.length) place(loose, 75, 105, 390);
    else place(loose, -150, 150, 210);
  }
  return pos;
}

function lastOf(e: NeighborEdge, cat: RelationCategory): string | undefined {
  const evs = cat === 'collab' ? e.collabEvents : e.projectEvents;
  return evs.reduce<string | undefined>((m, ev) => (!m || ev.date > m ? ev.date : m), undefined);
}

export default function RelationGraph({ center, edges, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!ref.current) return;
    const text = getComputedStyle(ref.current).getPropertyValue('--text').trim() || '#222';
    const surface = getComputedStyle(ref.current).getPropertyValue('--surface-2').trim() || '#f3f4f6';
    const vertical = ref.current.clientWidth < ref.current.clientHeight;
    // 縦長の画面では全体が縮小されるため、ノードと文字を大きめにしておく
    const k = vertical ? 1.35 : 1;
    const cy = cytoscape({
      container: ref.current,
      elements: buildElements(center, edges, vertical),
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 2.5,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(fill)',
            label: 'data(label)',
            color: text,
            'font-size': 12 * k,
            'text-valign': 'bottom',
            'text-margin-y': 4,
            width: 34 * k,
            height: 34 * k,
            'border-width': 2,
            'border-color': '#fff',
          },
        },
        { selector: 'node.center', style: { width: 56 * k, height: 56 * k, 'font-size': 15 * k, 'font-weight': 'bold', 'border-color': '#f2c94c', 'border-width': 4 } },
        { selector: 'node.retired', style: { opacity: 0.6 } },
        {
          selector: 'node.org',
          style: {
            'background-color': surface,
            'background-opacity': 0.6,
            'border-color': '#8a8f98',
            'border-width': 1.5,
            'border-style': 'dashed',
            shape: 'round-rectangle',
            label: 'data(label)',
            'text-valign': 'top',
            'text-halign': 'center',
            'font-size': 12 * k,
            'text-margin-y': -2,
            color: '#8a8f98',
            padding: '16px',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 'data(width)',
            'line-color': 'data(color)',
            'target-arrow-color': 'data(color)',
            'curve-style': 'bezier',
            opacity: 0.85,
            label: 'data(label)',
            'font-size': 10,
            color: text,
            'text-background-color': surface,
            'text-background-opacity': 0.9,
            'text-background-padding': '2px',
          },
        },
        { selector: 'edge.creation', style: { 'line-style': 'dashed', width: 2 } },
        { selector: 'edge.directed', style: { 'target-arrow-shape': 'triangle' } },
        { selector: 'edge.declared', style: { width: 1.5 } },
        { selector: 'edge.affiliation', style: { 'line-style': 'dotted', opacity: 0.5 } },
        { selector: 'node:active, node:selected', style: { 'overlay-opacity': 0.1 } },
      ],
      layout: { name: 'preset', padding: 40 },
    });

    cy.on('tap', 'node:childless', (evt) => {
      const id = evt.target.id();
      if (!id.startsWith('org:')) onSelectRef.current(id);
    });
    cy.on('mouseover', 'edge', (evt) => {
      const p = evt.renderedPosition;
      setTip({ x: p.x, y: p.y, lines: evt.target.data('tip') });
    });
    cy.on('mouseout', 'edge', () => setTip(null));
    // タッチ端末ではホバーできないため、線をタップしたときにも表示する
    cy.on('tap', 'edge', (evt) => {
      const p = evt.renderedPosition;
      setTip({ x: p.x, y: p.y, lines: evt.target.data('tip') });
    });
    cy.on('tap', (evt) => {
      if (evt.target === cy) setTip(null);
    });
    cy.on('mouseover', 'node', (evt) => {
      if (!evt.target.isParent()) ref.current!.style.cursor = 'pointer';
    });
    cy.on('mouseout', 'node', () => (ref.current!.style.cursor = ''));
    cy.on('pan zoom', () => setTip(null));

    return () => cy.destroy();
  }, [center, edges]);

  return (
    <div className="graph-wrap">
      <div ref={ref} className="graph" role="img" aria-label={`${center.name}を中心にした関係図。図の下に同じ内容の一覧があります。`} />
      {tip && (
        <div className="graph-tip" style={{ left: tip.x + 12, top: tip.y + 12 }}>
          {tip.lines.map((l, i) => (
            <div key={i} className={i === 0 ? 'strong' : ''}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
