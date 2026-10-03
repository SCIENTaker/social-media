import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../lib/store';
import { SearchBox } from '../components/SearchBox';
import { useTitle } from '../components/Layout';
import { PathView } from './PairPage';

export function PathPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const from = db.person(params.get('from') ?? '');
  const to = db.person(params.get('to') ?? '');
  useTitle(from && to ? `${from.name}から${to.name}への経路` : '経路検索');
  const steps = from && to ? db.shortestPath(from.id, to.id) : undefined;

  const set = (key: 'from' | 'to', id: string) => {
    const next = new URLSearchParams(params);
    next.set(key, id);
    navigate(`/path?${next}`, { replace: true });
  };

  return (
    <div className="stack">
      <section className="card">
        <h1>経路検索</h1>
        <p className="muted">2人をつなぐ、最も短い共演の連なりを探します(例: A → C → B)。</p>
        <div className="pair-picker">
          <SearchBox label="出発" value={from} onSelect={(p) => set('from', p.id)} />
          <span className="pair-x" aria-hidden>
            →
          </span>
          <SearchBox label="到着" value={to} onSelect={(p) => set('to', p.id)} />
        </div>
      </section>
      {from && to && (
        <section className="card">
          {from.id === to.id ? (
            <p className="muted">別々の2人を選んでください。</p>
          ) : steps ? (
            <>
              <h2>
                {steps.length}ステップでつながります
              </h2>
              <PathView steps={steps} />
            </>
          ) : (
            <p className="muted">登録済みの共演からは、2人をつなぐ経路が見つかりませんでした。</p>
          )}
        </section>
      )}
    </div>
  );
}
