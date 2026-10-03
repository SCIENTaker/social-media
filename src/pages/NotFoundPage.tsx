import { Link } from 'react-router-dom';
import { useTitle } from '../components/Layout';

export function NotFoundPage() {
  useTitle('ページが見つかりません');
  return (
    <section className="card">
      <h1>ページが見つかりません</h1>
      <p className="muted">人物が改名・統合された、または掲載を停止した可能性があります。</p>
      <Link to="/">トップへ戻る</Link>
    </section>
  );
}
