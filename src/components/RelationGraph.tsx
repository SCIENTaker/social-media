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

function buildElements(center: Person, edges: NeighborEdge[]): ElementDefinition[] {
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
 * 中心人物を原点に置き、同じ枠(事務所)の人は左側、それ以外は枠ごとにまとめて右側へ扇状に並べる。
 * 枠の外の人が枠の中に入り込んで「所属している」ように見えるのを防ぐため、自動レイアウトは使わない。
 */
function layoutPositions(centerId: string, edges: NeighborEdge[], parents: Map<string, string | undefined>) {
  const pos = new Map<string, { x: number; y: number }>([[centerId, { x: 0, y: 0 }]]);
  const groups = new Map<string, NeighborEdge[]>();
  for (const e of edges) {
    const key = parents.get(e.other.id) ?? '';
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const own = parents.get(centerId);
  const place = (list: NeighborEdge[], from: number, to: number) => {
    const many = list.length > 7;
    list.forEach((e, i) => {
      const t = list.length === 1 ? 0.5 : i / (list.length - 1);
      const angle = ((from + (to - from) * t) * Math.PI) / 180;
      const r = many ? (i % 2 ? 270 : 180) : 210;
      pos.set(e.other.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    });
  };
  const ownList = own ? (groups.get(own) ?? []) : [];
  if (ownList.length) place(ownList, 110, 250);
  const rest = [...groups].filter(([k]) => !own || k !== own);
  // 右側(-70°〜70°)を枠ごとに分け、間に少し隙間をあける
  const total = rest.reduce((n, [, l]) => n + l.length, 0);
  const span = ownList.length ? 140 : 300;
  const start = ownList.length ? -70 : -150;
  const gap = rest.length > 1 ? 12 : 0;
  const usable = span - gap * (rest.length - 1);
  let cursor = start;
  for (const [, list] of rest) {
    const width = (usable * list.length) / Math.max(total, 1);
    place(list, cursor, cursor + width);
    cursor += width + gap;
  }
  return pos;
}

function lastOf(e: NeighborEdge, cat: RelationCategory): string | undefined {
  const evs = cat === 'collab' ? e.collabEvents : e.projectEvents;
  return evs.reduce<string | undefined>((m, ev) => (!m || ev.date > m ? ev.date : m), undefined);
}

export function RelationGraph({ center, edges, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!ref.current) return;
    const text = getComputedStyle(ref.current).getPropertyValue('--text').trim() || '#222';
    const surface = getComputedStyle(ref.current).getPropertyValue('--surface-2').trim() || '#f3f4f6';
    const cy = cytoscape({
      container: ref.current,
      elements: buildElements(center, edges),
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
            'font-size': 12,
            'text-valign': 'bottom',
            'text-margin-y': 4,
            width: 34,
            height: 34,
            'border-width': 2,
            'border-color': '#fff',
          },
        },
        { selector: 'node.center', style: { width: 56, height: 56, 'font-size': 15, 'font-weight': 'bold', 'border-color': '#f2c94c', 'border-width': 4 } },
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
            'font-size': 11,
            color: '#8a8f98',
            padding: '14px',
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

export function GraphLegend() {
  return (
    <div className="legend">
      {(['collab', 'project', 'creation', 'declared'] as RelationCategory[]).map((c) => (
        <span key={c} className="legend-item">
          <svg width="28" height="10" aria-hidden>
            <line
              x1="0"
              y1="5"
              x2="28"
              y2="5"
              stroke={CATEGORY_COLORS[c]}
              strokeWidth={c === 'collab' || c === 'project' ? 4 : 2}
              strokeDasharray={c === 'creation' ? '5 3' : undefined}
            />
          </svg>
          {CATEGORY_LABELS[c]}
        </span>
      ))}
      <span className="legend-item">
        <span className="legend-frame" />
        {CATEGORY_LABELS.affiliation}(枠)
      </span>
      <span className="legend-item muted">線の太さ = 期間内の回数</span>
    </div>
  );
}
