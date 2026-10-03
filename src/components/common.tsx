import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/store';
import { KIND_LABELS, SOURCE_KIND_LABELS, STATUS_LABELS, EVENT_KIND_LABELS, CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/labels';
import type { Person, RelationCategory, StreamEvent } from '../lib/types';
import { formatDate } from '../lib/format';

/** 画像は自前で持たないため、頭文字のアバターで表す */
export function Avatar({ person, size = 36 }: { person: Person; size?: number }) {
  return (
    <span className={`avatar avatar-${person.kind}`} style={{ width: size, height: size, fontSize: size * 0.45 }} aria-hidden>
      {person.name.slice(0, 1)}
    </span>
  );
}

export function PersonChip({ person, to }: { person: Person; to?: string }) {
  return (
    <Link className="chip" to={to ?? `/p/${person.id}`}>
      <Avatar person={person} size={22} />
      {person.name}
    </Link>
  );
}

export function PersonBadges({ person }: { person: Person }) {
  return (
    <span className="badges">
      <span className={`badge badge-${person.kind}`}>{KIND_LABELS[person.kind]}</span>
      <span className={`badge badge-status-${person.status}`}>{STATUS_LABELS[person.status]}</span>
    </span>
  );
}

export function CategoryTag({ category }: { category: RelationCategory }) {
  return (
    <span className="cat-tag" style={{ '--c': CATEGORY_COLORS[category] } as CSSProperties}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export function SourceLinks({ ids }: { ids: string[] }) {
  return (
    <span className="sources">
      {ids.map((id, i) => {
        const s = db.source(id);
        if (!s) return null;
        return (
          <span key={id}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${s.title ? s.title + ' ・ ' : ''}取得日 ${formatDate(s.retrieved)}`}
            >
              出典{ids.length > 1 ? i + 1 : ''}({SOURCE_KIND_LABELS[s.kind]})
            </a>
            {s.archiveUrl && (
              <>
                {' '}
                <a href={s.archiveUrl} target="_blank" rel="noopener noreferrer" className="muted">
                  [魚拓]
                </a>
              </>
            )}
          </span>
        );
      })}
    </span>
  );
}

export function EventRow({
  event,
  showParticipants = true,
  note,
}: {
  event: StreamEvent;
  showParticipants?: boolean;
  note?: string;
}) {
  const { visible, hiddenCount } = db.visibleParticipants(event);
  return (
    <li className="event-row">
      <div className="event-meta">
        <time>{formatDate(event.date)}</time>
        <span className="badge">{EVENT_KIND_LABELS[event.kind]}</span>
      </div>
      <div className="event-body">
        <Link to={`/event/${event.id}`} className="event-title">
          {event.title}
        </Link>
        {note && <div className="event-note">{note}</div>}
        {showParticipants && (
          <div className="event-people">
            {visible.map((p) => p.name).join('、')}
            {hiddenCount > 0 && ` ほか非公開${hiddenCount}名`}
          </div>
        )}
        <SourceLinks ids={event.sourceIds} />
      </div>
    </li>
  );
}
