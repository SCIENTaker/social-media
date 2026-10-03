import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db } from '../lib/store';
import { PERIOD_LABELS, type NeighborEdge, type Period } from '../lib/db';
import { CATEGORY_LABELS, CATEGORY_ORDER, ORG_KIND_LABELS } from '../lib/labels';
import type { RelationCategory } from '../lib/types';
import { formatDate, pairPath } from '../lib/format';
import { Avatar, CategoryTag, EventRow, PersonBadges } from '../components/common';
import { GraphLegend } from '../components/GraphLegend';

// 描画ライブラリが大きいため、関係図は必要になってから読み込む
const RelationGraph = lazy(() => import('../components/RelationGraph'));
import { useTitle } from '../components/Layout';
import { NotFoundPage } from './NotFoundPage';
import { GRAPH_MAX_NODES } from '../config';

const PERIODS: Period[] = ['3m', '1y', 'all'];

/** 無効にした分類の情報を取り除いた関係を返す。何も残らなければ undefined */
function filterEdge(e: NeighborEdge, enabled: Set<RelationCategory>): NeighborEdge | undefined {
  const collabEvents = enabled.has('collab') ? e.collabEvents : [];
  const projectEvents = enabled.has('project') ? e.projectEvents : [];
  const relations = e.relations.filter((r) => enabled.has(r.type));
  const sharedOrgs = enabled.has('affiliation') ? e.sharedOrgs : [];
  const categories = new Set([...e.categories].filter((c) => enabled.has(c)));
  if (!categories.size) return undefined;
  const dates = [...collabEvents, ...projectEvents].map((ev) => ev.date).sort();
  return {
    ...e,
    collabEvents,
    projectEvents,
    relations,
    sharedOrgs,
    categories,
    count: collabEvents.length + projectEvents.length,
    first: dates[0],
    last: dates[dates.length - 1],
  };
}

export function PersonPage() {
  const { id = '' } = useParams();
  const person = db.person(id);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  useTitle(person ? `${person.name}の関係図` : undefined);

  const period = (PERIODS.includes(params.get('period') as Period) ? params.get('period') : 'all') as Period;
  const typesParam = params.get('types');
  const enabled = useMemo(
    () => new Set<RelationCategory>(typesParam ? (typesParam.split(',') as RelationCategory[]) : CATEGORY_ORDER),
    [typesParam],
  );

  const edges = useMemo(() => {
    if (!person) return [];
    return db
      .neighbors(person.id, period)
      .map((e) => filterEdge(e, enabled))
      .filter((e): e is NeighborEdge => !!e)
      .sort((a, b) => b.count - a.count || (b.last ?? '').localeCompare(a.last ?? ''));
  }, [person, period, enabled]);
  const shown = useMemo(() => edges.slice(0, GRAPH_MAX_NODES), [edges]);

  if (!person) return <NotFoundPage />;

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const toggle = (c: RelationCategory) => {
    const next = new Set(enabled);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    update('types', next.size === CATEGORY_ORDER.length ? null : CATEGORY_ORDER.filter((x) => next.has(x)).join(','));
  };

  const memberships = db.membershipsOf(person.id);
  const agencyMates = db.agencyMates(person.id);
  const relationPublic = db.isRelationPublic(person.id);
  const events = [...db.eventsOf(person.id)].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  return (
    <div className="stack">
      <section className="card profile">
        <Avatar person={person} size={72} />
        <div className="profile-body">
          <h1>
            {person.name} <span className="muted kana">{person.kana}</span>
          </h1>
          <PersonBadges person={person} />
          {person.aliases.length > 0 && <p className="muted small">別名・旧名: {person.aliases.join('、')}</p>}
          <p>{person.bio}</p>
          <dl className="facts">
            {person.debut && (
              <>
                <dt>デビュー</dt>
                <dd>{formatDate(person.debut)}</dd>
              </>
            )}
            {memberships.length > 0 && (
              <>
                <dt>所属</dt>
                <dd>
                  {memberships.map((m) => {
                    const o = db.org(m.orgId)!;
                    return (
                      <div key={m.orgId}>
                        <Link to={`/org/${o.id}`}>{o.name}</Link>
                        <span className="muted small">
                          {' '}
                          {ORG_KIND_LABELS[o.kind]}
                          {m.role && ` ・ ${m.role}`}
                          {m.end && ` ・ 〜${formatDate(m.end)}`}
                        </span>
                      </div>
                    );
                  })}
                </dd>
              </>
            )}
            <dt>公式リンク</dt>
            <dd className="links">
              {person.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
              ))}
            </dd>
          </dl>
        </div>
        <button
          className="button secondary share"
          onClick={() => {
            navigator.clipboard?.writeText(location.href).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? 'コピーしました' : 'URLをコピー'}
        </button>
      </section>

      {!relationPublic ? (
        <section className="card notice">本人の希望により、この人物の関係情報は表示していません。</section>
      ) : (
        <>
          <section className="card">
            <div className="section-head">
              <h2>関係図</h2>
              <div className="filters">
                <div className="segmented" role="group" aria-label="期間">
                  {PERIODS.map((p) => (
                    <button key={p} className={p === period ? 'on' : ''} onClick={() => update('period', p === 'all' ? null : p)}>
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}
                </div>
                <div className="checks" role="group" aria-label="関係の種類">
                  {CATEGORY_ORDER.map((c) => (
                    <label key={c}>
                      <input type="checkbox" checked={enabled.has(c)} onChange={() => toggle(c)} />
                      {CATEGORY_LABELS[c]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {shown.length ? (
              <>
                <Suspense fallback={<div className="graph graph-loading">関係図を読み込み中…</div>}>
                  <RelationGraph center={person} edges={shown} onSelect={(pid) => pid !== person.id && navigate(`/p/${pid}`)} />
                </Suspense>
                <GraphLegend />
                <p className="muted small">人物をクリックするとその人を中心に移動します。線にカーソルを合わせる(スマートフォンではタップする)と、根拠の件数と直近の共演日が表示されます。</p>
              </>
            ) : (
              <p className="muted">この条件に当てはまる関係は、まだ登録されていません。</p>
            )}
            {agencyMates.map(({ org, count }) => (
              <p key={org.id} className="muted small agency-mates">
                同じ事務所の所属者は図に含めていません(ユニット・同期・共演のある相手のみ表示)。
                <Link to={`/org/${org.id}`}>
                  {org.name}の所属者 {count}人を見る →
                </Link>
              </p>
            ))}
          </section>

          <section className="card">
            <h2>
              関係一覧 <span className="muted small">共演回数順 ・ {PERIOD_LABELS[period]} ・ {edges.length}人</span>
            </h2>
            {edges.length > GRAPH_MAX_NODES && (
              <p className="muted small">図には上位{GRAPH_MAX_NODES}人を表示しています。残りはこの一覧で確認できます。</p>
            )}
            <ol className="rel-list">
              {edges.map((e, i) => (
                <li key={e.other.id}>
                  <span className="rank">{e.count > 0 ? i + 1 : '–'}</span>
                  <Link to={`/p/${e.other.id}`} className="rel-name">
                    <Avatar person={e.other} size={28} />
                    {e.other.name}
                  </Link>
                  <span className="rel-tags">
                    {CATEGORY_ORDER.filter((c) => e.categories.has(c)).map((c) => (
                      <CategoryTag key={c} category={c} />
                    ))}
                    {e.relations.map((r) => (
                      <span key={r.id} className="muted small">
                        {r.label}
                      </span>
                    ))}
                  </span>
                  <span className="rel-count">
                    {e.count > 0 ? (
                      <>
                        <strong>{e.count}</strong>回<span className="muted small"> 直近 {formatDate(e.last)}</span>
                      </>
                    ) : (
                      <span className="muted small">共演なし</span>
                    )}
                  </span>
                  <Link to={pairPath(person.id, e.other.id)} className="small rel-link">
                    根拠を見る →
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            <h2>最近の参加配信・企画</h2>
            <ul className="event-list">
              {events.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
