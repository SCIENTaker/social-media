import { Link, useNavigate } from 'react-router-dom';
import { SearchBox } from '../components/SearchBox';
import { EventRow, PersonChip } from '../components/common';
import { useTitle } from '../components/Layout';
import { db } from '../lib/store';
import { ORG_KIND_LABELS } from '../lib/labels';
import { SITE_TAGLINE } from '../config';

export function HomePage() {
  useTitle(undefined);
  const navigate = useNavigate();
  const orgs = db.data.orgs;
  const tournaments = db.data.events.filter((e) => e.kind === 'tournament' || e.kind === 'project').slice(-4).reverse();
  const featured = db.data.persons.filter((p) => p.kind !== 'creator' && p.status === 'active');

  return (
    <div className="home">
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
          <h2>最近のコラボ</h2>
          <ul className="event-list">
            {db.recentEvents(6).map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ul>
        </section>
        <div className="stack">
          <section className="card">
            <h2>事務所・ユニット・チーム</h2>
            <ul className="org-list">
              {orgs.map((o) => (
                <li key={o.id}>
                  <Link to={`/org/${o.id}`}>{o.name}</Link>
                  <span className="badge small">{ORG_KIND_LABELS[o.kind]}</span>
                  <span className="muted small">{db.membersOf(o.id).length}人</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2>企画・大会</h2>
            <ul className="org-list">
              {tournaments.map((e) => (
                <li key={e.id}>
                  <Link to={`/event/${e.id}`}>{e.title}</Link>
                  <span className="muted small">{e.participants.length}人参加</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="card">
        <h2>掲載中の人物</h2>
        <div className="chips">
          {featured.map((p) => (
            <PersonChip key={p.id} person={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
