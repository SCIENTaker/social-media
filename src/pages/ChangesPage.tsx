import { useTitle } from '../components/Layout';
import { db } from '../lib/store';
import { formatDate } from '../lib/format';

export function ChangesPage() {
  useTitle('変更履歴');
  const changes = [...db.data.changes].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="stack narrow">
      <section className="card">
        <h1>変更履歴</h1>
        <p className="muted">誤情報の追跡と差し戻しのため、すべての変更を公開しています。</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>日付</th>
                <th>対象</th>
                <th>変更内容</th>
                <th>変更者</th>
                <th>承認者</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c, i) => (
                <tr key={i}>
                  <td>{formatDate(c.date)}</td>
                  <td>{c.target}</td>
                  <td>{c.summary}</td>
                  <td>{c.editor}</td>
                  <td>{c.approver}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
