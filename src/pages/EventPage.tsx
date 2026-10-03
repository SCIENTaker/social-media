import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/store';
import { EVENT_KIND_LABELS } from '../lib/labels';
import { formatDate } from '../lib/format';
import { PersonChip, SourceLinks } from '../components/common';
import { useTitle } from '../components/Layout';
import { NotFoundPage } from './NotFoundPage';

const TEAM_COLORS = ['#2f7de1', '#e8871e', '#35a77c', '#d6457a', '#9b59d0', '#c9a227'];

export function EventPage() {
  const { id = '' } = useParams();
  const event = db.event(id);
  useTitle(event?.title);
  if (!event) return <NotFoundPage />;

  const { visible, hiddenCount } = db.visibleParticipants(event);
  const host = event.host ? (db.person(event.host) ?? db.org(event.host)) : undefined;
  const hostLink = event.host && db.org(event.host) ? `/org/${event.host}` : `/p/${event.host}`;
  const inTeam = new Set(event.teams?.flatMap((t) => t.members));
  const others = visible.filter((p) => !inTeam.has(p.id));

  return (
    <div className="stack">
      <section className="card">
        <span className="badge">{EVENT_KIND_LABELS[event.kind]}</span>
        <h1>{event.title}</h1>
        <dl className="facts">
          <dt>日時</dt>
          <dd>{formatDate(event.date)}</dd>
          {host && (
            <>
              <dt>主催</dt>
              <dd>
                <Link to={hostLink}>{host.name}</Link>
              </dd>
            </>
          )}
          <dt>出典</dt>
          <dd>
            <SourceLinks ids={event.sourceIds} />
          </dd>
        </dl>
      </section>

      <section className="card">
        <h2>参加者({event.participants.length}人)</h2>
        {event.teams?.map((t, i) => (
          <div key={t.name} className="team" style={{ borderColor: TEAM_COLORS[i % TEAM_COLORS.length] }}>
            <h3 style={{ color: TEAM_COLORS[i % TEAM_COLORS.length] }}>{t.name}</h3>
            <div className="chips">
              {t.members
                .filter((m) => db.isRelationPublic(m))
                .map((m) => (
                  <PersonChip key={m} person={db.person(m)!} />
                ))}
            </div>
          </div>
        ))}
        {others.length > 0 && (
          <div className="chips">
            {others.map((p) => (
              <PersonChip key={p.id} person={p} />
            ))}
          </div>
        )}
        {hiddenCount > 0 && <p className="muted small">ほか、本人の希望により非公開の参加者が{hiddenCount}名います。</p>}
      </section>
    </div>
  );
}
