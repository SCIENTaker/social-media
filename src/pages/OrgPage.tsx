import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/store';
import { ORG_KIND_LABELS } from '../lib/labels';
import { formatDate, pairPath } from '../lib/format';
import { PersonChip, SourceLinks, EventRow } from '../components/common';
import { useTitle } from '../components/Layout';
import { NotFoundPage } from './NotFoundPage';

export function OrgPage() {
  const { id = '' } = useParams();
  const org = db.org(id);
  const [showFormer, setShowFormer] = useState(false);
  useTitle(org?.name);
  if (!org) return <NotFoundPage />;

  const today = new Date().toISOString().slice(0, 10);
  const all = db.membersOf(org.id);
  const members = all.filter((m) => showFormer || !m.end || m.end >= today);
  const groups = new Map<string, typeof members>();
  for (const m of members) {
    const key = m.role ?? 'メンバー';
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const children = db.data.orgs.filter((o) => o.parent === org.id);
  const parent = org.parent ? db.org(org.parent) : undefined;

  // 組織内の共演マップ(メンバー同士の共演回数の表)
  const people = members.map((m) => db.person(m.personId)!).filter((p) => db.isRelationPublic(p.id));
  const counts = new Map(people.map((p) => [p.id, new Map(db.neighbors(p.id).map((e) => [e.other.id, e.count]))]));
  const max = Math.max(1, ...people.flatMap((p) => [...counts.get(p.id)!.values()]));
  const events = db.eventsHostedBy(org.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="stack">
      <section className="card">
        <h1>
          {org.name} <span className="badge">{ORG_KIND_LABELS[org.kind]}</span>
        </h1>
        <dl className="facts">
          {org.company && (
            <>
              <dt>運営</dt>
              <dd>{org.company}</dd>
            </>
          )}
          {parent && (
            <>
              <dt>所属</dt>
              <dd>
                <Link to={`/org/${parent.id}`}>{parent.name}</Link>
              </dd>
            </>
          )}
          {org.start && (
            <>
              <dt>開始</dt>
              <dd>{formatDate(org.start)}</dd>
            </>
          )}
          {org.url && (
            <>
              <dt>公式</dt>
              <dd>
                <a href={org.url} target="_blank" rel="noopener noreferrer">
                  {org.url}
                </a>
              </dd>
            </>
          )}
          {children.length > 0 && (
            <>
              <dt>ユニット等</dt>
              <dd className="links">
                {children.map((c) => (
                  <Link key={c.id} to={`/org/${c.id}`}>
                    {c.name}
                  </Link>
                ))}
              </dd>
            </>
          )}
        </dl>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>所属者({members.length}人)</h2>
          <label className="small">
            <input type="checkbox" checked={showFormer} onChange={(e) => setShowFormer(e.target.checked)} /> 卒業・脱退した人も表示
          </label>
        </div>
        {[...groups].map(([role, ms]) => (
          <div key={role} className="member-group">
            <h3>{role}</h3>
            <ul className="member-list">
              {ms.map((m) => (
                <li key={m.personId}>
                  <PersonChip person={db.person(m.personId)!} />
                  <span className="muted small">
                    {formatDate(m.start)}〜{m.end ? formatDate(m.end) : ''}
                  </span>
                  <SourceLinks ids={m.sourceIds} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {people.length > 1 && (
        <section className="card">
          <h2>組織内の共演マップ</h2>
          <p className="muted small">数字はメンバー同士の共演・企画の回数(全期間)。クリックで2人の関係を表示します。</p>
          <div className="matrix-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th />
                  {people.map((p) => (
                    <th key={p.id} scope="col">
                      <span className="vert">{p.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {people.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.name}</th>
                    {people.map((col) => {
                      if (row.id === col.id) return <td key={col.id} className="self" />;
                      const n = counts.get(row.id)!.get(col.id) ?? 0;
                      return (
                        <td key={col.id} style={{ '--a': n / max } as CSSProperties}>
                          {n > 0 ? <Link to={pairPath(row.id, col.id)}>{n}</Link> : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="card">
          <h2>主催した配信・企画</h2>
          <ul className="event-list">
            {events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
