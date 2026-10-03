import { Link, useNavigate } from 'react-router-dom';
import { SearchBox } from '../components/SearchBox';
import { EventRow, PersonChip } from '../components/common';
import { useTitle } from '../components/Layout';
import { db } from '../lib/store';
import { ORG_KIND_LABELS } from '../lib/labels';
import { SITE_TAGLINE } from '../config';
import { formatDate } from '../lib/format';

export function HomePage() {
  useTitle(undefined);
  const navigate = useNavigate();
  const agencies = db.data.orgs.filter((o) => o.kind === 'agency');
  const childrenOf = (id: string) => db.data.orgs.filter((o) => o.parent === id);
  const lastUpdate = db.data.changes.map((c) => c.date).sort().at(-1);
  const today = new Date().toISOString().slice(0, 10);
  const activeMembers = (orgId: string) =>
    db
      .membersOf(orgId)
      .filter((m) => !m.end || m.end >= today)
      .map((m) => db.person(m.personId)!)
      .sort((a, b) => a.kana.localeCompare(b.kana, 'ja'));

  return (
    <div className="home stack">
      <section className="hero">
        <h1>この人だれ?を、つながりから。</h1>
        <p className="muted">{SITE_TAGLINE}</p>
        <SearchBox autoFocus onSelect={(p) => navigate(`/p/${p.id}`)} />
        <div className="hero-links">
          <Link to="/pair" className="button secondary">
            2人の関係を調べる
          </Link>
          <Link to="/path" className="button secondary">
            2人をつなぐ経路を探す
          </Link>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>最近の共演・企画</h2>
          <ul className="event-list">
            {db.recentEvents(6).map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ul>
        </section>
        <div className="stack">
          <section className="card">
            <h2>事務所・ユニット</h2>
            <ul className="org-list">
              {agencies.map((o) => (
                <li key={o.id} className="org-item">
                  <div>
                    <Link to={`/org/${o.id}`} className="strong">
                      {o.name}
                    </Link>
                    <span className="muted small"> {activeMembers(o.id).length}人</span>
                  </div>
                  <div className="org-children">
                    {childrenOf(o.id).map((c) => (
                      <Link key={c.id} to={`/org/${c.id}`} className="small">
                        {c.name}
                        <span className="muted">({ORG_KIND_LABELS[c.kind]})</span>
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2>データについて</h2>
            <dl className="facts stats">
              <dt>掲載人数</dt>
              <dd>{db.data.persons.length}人</dd>
              <dt>イベント</dt>
              <dd>{db.data.events.length}件</dd>
              <dt>出典</dt>
              <dd>{db.data.sources.length}件</dd>
              <dt>最終更新</dt>
              <dd>
                <Link to="/changes">{formatDate(lastUpdate)}</Link>
              </dd>
            </dl>
            <p className="muted small">
              すべての関係に出典を付けています。<Link to="/submit">情報提供</Link>はいつでも受け付けています。
            </p>
          </section>
        </div>
      </div>

      {agencies.map((o) => (
        <section key={o.id} className="card">
          <h2>
            {o.name}の所属者 <span className="muted small">{activeMembers(o.id).length}人(五十音順)</span>
          </h2>
          <div className="chips">
            {activeMembers(o.id).map((p) => (
              <PersonChip key={p.id} person={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
