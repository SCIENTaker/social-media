import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/store';
import { formatDate, pairPath } from '../lib/format';
import { Avatar, CategoryTag, EventRow, PersonBadges, PersonChip, SourceLinks } from '../components/common';
import { SearchBox } from '../components/SearchBox';
import { useTitle } from '../components/Layout';
import { CATEGORY_ORDER, ORG_KIND_LABELS } from '../lib/labels';
import type { Person } from '../lib/types';

export function PairPage() {
  const { a = '', b = '' } = useParams();
  const pa = db.person(a);
  const pb = db.person(b);
  useTitle(pa && pb ? `${pa.name}と${pb.name}の関係` : '2人の関係');

  return (
    <div className="stack">
      <PairPicker a={pa} b={pb} />
      {pa && pb && pa.id !== pb.id && <PairDetail key={`${pa.id}-${pb.id}`} a={pa} b={pb} />}
    </div>
  );
}

function PairPicker({ a, b }: { a?: Person; b?: Person }) {
  const navigate = useNavigate();
  const [x, setX] = useState<Person | undefined>(a);
  const [y, setY] = useState<Person | undefined>(b);
  const go = (p?: Person, q?: Person) => p && q && p.id !== q.id && navigate(pairPath(p.id, q.id));
  return (
    <section className="card">
      <h1>2人の関係</h1>
      <div className="pair-picker" key={`${a?.id}-${b?.id}`}>
        <SearchBox label="1人目" value={x} onSelect={(p) => (setX(p), go(p, y))} />
        <span className="pair-x" aria-hidden>
          ×
        </span>
        <SearchBox label="2人目" value={y} onSelect={(p) => (setY(p), go(x, p))} />
      </div>
    </section>
  );
}

function PairDetail({ a, b }: { a: Person; b: Person }) {
  const edge = db.pair(a.id, b.id);
  const events = edge ? [...edge.collabEvents, ...edge.projectEvents].sort((x, y) => y.date.localeCompare(x.date)) : [];
  const years = [...new Set(events.map((e) => e.date.slice(0, 4)))];
  const [year, setYear] = useState<string>('all');
  const filtered = year === 'all' ? events : events.filter((e) => e.date.startsWith(year));
  const common = db.commonCollaborators(a.id, b.id);
  const path = !edge?.count ? db.shortestPath(a.id, b.id) : undefined;

  return (
    <>
      <section className="card pair-head">
        {[a, b].map((p) => (
          <Link key={p.id} to={`/p/${p.id}`} className="pair-person">
            <Avatar person={p} size={56} />
            <strong>{p.name}</strong>
            <PersonBadges person={p} />
          </Link>
        ))}
        <div className="pair-summary">
          {edge ? (
            <>
              <div className="rel-tags">
                {CATEGORY_ORDER.filter((c) => edge.categories.has(c)).map((c) => (
                  <CategoryTag key={c} category={c} />
                ))}
              </div>
              {edge.count > 0 && (
                <p>
                  共演・企画 <strong className="big">{edge.count}</strong> 回
                  <br />
                  <span className="muted small">
                    初共演 {formatDate(edge.first)} ・ 直近 {formatDate(edge.last)}
                  </span>
                </p>
              )}
            </>
          ) : (
            <p className="muted">出典で確認できる直接の関係はまだ登録されていません。</p>
          )}
        </div>
      </section>

      {edge && (edge.sharedOrgs.length > 0 || edge.relations.length > 0) && (
        <section className="card">
          <h2>関係の種類と根拠</h2>
          <ul className="evidence">
            {edge.sharedOrgs.map((o) => {
              const ma = db.membershipsOf(a.id).find((m) => m.orgId === o.id)!;
              const mb = db.membershipsOf(b.id).find((m) => m.orgId === o.id)!;
              return (
                <li key={o.id}>
                  <CategoryTag category="affiliation" />
                  <span>
                    <Link to={`/org/${o.id}`}>{o.name}</Link>({ORG_KIND_LABELS[o.kind]})
                    {ma.role && mb.role && ma.role === mb.role && ` ・ 同期(${ma.role})`}
                  </span>
                  <SourceLinks ids={[...new Set([...ma.sourceIds, ...mb.sourceIds])]} />
                </li>
              );
            })}
            {edge.relations.map((r) => (
              <li key={r.id}>
                <CategoryTag category={r.type} />
                <span>
                  {r.directed && `${db.person(r.a)!.name} → ${db.person(r.b)!.name}:`}
                  {r.label}
                  {r.start && <span className="muted small"> ({formatDate(r.start)}〜)</span>}
                </span>
                <SourceLinks ids={r.sourceIds} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {events.length > 0 && (
        <section className="card">
          <div className="section-head">
            <h2>共演した配信・企画({filtered.length}件)</h2>
            <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="年で絞り込む">
              <option value="all">すべての年</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </div>
          <ul className="event-list">
            {filtered.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ul>
        </section>
      )}

      {path && path.length > 0 && (
        <section className="card">
          <h2>2人をつなぐ経路</h2>
          <PathView steps={path} />
        </section>
      )}

      <section className="card">
        <h2>共通の共演者({common.length}人)</h2>
        {common.length ? (
          <ul className="common-list">
            {common.map((c) => (
              <li key={c.person.id}>
                <PersonChip person={c.person} />
                <span className="muted small">
                  {a.name}と{c.countA}回 ・ {b.name}と{c.countB}回
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">共通の共演者はいません。</p>
        )}
      </section>
    </>
  );
}

export function PathView({ steps }: { steps: ReturnType<typeof db.shortestPath> & {} }) {
  return (
    <ol className="path">
      {steps.map((s, i) => (
        <li key={i}>
          {i === 0 && <PersonChip person={db.person(s.from)!} />}
          <div className="path-link">
            <span className="path-line" aria-hidden />
            <span className="small">
              <Link to={`/event/${s.event.id}`}>{s.event.title}</Link>
              <span className="muted"> ({formatDate(s.event.date)})</span>
            </span>
          </div>
          <PersonChip person={db.person(s.to)!} />
        </li>
      ))}
    </ol>
  );
}
