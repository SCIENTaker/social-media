import { Link } from 'react-router-dom';
import { useTitle } from '../components/Layout';
import { CategoryTag } from '../components/common';
import type { RelationCategory } from '../lib/types';

const RULES: { cat: RelationCategory; example: string; source: string; dir: string; view: string }[] = [
  { cat: 'affiliation', example: '同じ事務所、同期・期生、公式ユニット', source: '公式サイト・公式発表', dir: '双方向', view: '同じ組織の枠で囲む' },
  { cat: 'collab', example: 'コラボ配信、ゲスト出演、歌・動画コラボ', source: '配信アーカイブ・動画', dir: '双方向', view: '実線、回数で太さを変える' },
  { cat: 'project', example: 'スト鯖、大会チーム、合同企画', source: '主催者の告知・配信', dir: '双方向', view: 'イベント単位でまとめる' },
  { cat: 'creation', example: '担当絵師(ママ・パパ)、モデラー、楽曲提供', source: '公式プロフィール・本人の公表', dir: 'A→B', view: '点線の矢印' },
  { cat: 'declared', example: '師弟、先輩後輩、「相方」など本人が明言したもの', source: '本人の発言が含まれる配信・投稿', dir: '内容による', view: '細い実線+ラベル' },
];

export function PolicyPage() {
  useTitle('掲載基準・コンテンツポリシー');
  return (
    <div className="stack narrow prose">
      <section className="card">
        <h1>掲載基準・コンテンツポリシー</h1>
        <p>このサイトの信頼は「書かないこと」を守れるかで決まると考えています。以下の基準で運営しています。</p>
      </section>

      <section className="card">
        <h2>掲載対象</h2>
        <ul>
          <li>事務所所属のVTuber(現役・卒業済みを含む)</li>
          <li>個人勢VTuber:一定以上のチャンネル登録者数がある、または掲載済み人物との公開コラボ実績がある人</li>
          <li>配信者・ストリーマー:掲載済み人物との公開コラボ実績がある人</li>
          <li>クリエイター(絵師・モデラー・作曲家):公式に公表された制作関係があり、公開のSNSアカウントを持つ人</li>
        </ul>
        <h3>掲載しないもの</h3>
        <ul>
          <li>公開の配信・SNSアカウントを持たない人物(スタッフ、家族、一般人)</li>
          <li>本人や事務所から掲載停止の依頼があった人物</li>
          <li>引退後に関係情報の非公開を求めている人物(基本情報のみ残すか、全削除するかを選べます)</li>
        </ul>
      </section>

      <section className="card">
        <h2>関係の種類</h2>
        <p>関係は次の5分類に限定し、すべて公開情報で裏付けられるものだけを載せます。</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>分類</th>
                <th>具体例</th>
                <th>根拠として認める出典</th>
                <th>向き</th>
                <th>図での表現</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((r) => (
                <tr key={r.cat}>
                  <td>
                    <CategoryTag category={r.cat} />
                  </td>
                  <td>{r.example}</td>
                  <td>{r.source}</td>
                  <td>{r.dir}</td>
                  <td>{r.view}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">共演回数は関係として直接書かず、登録されたイベント(配信・企画)の参加者から毎回集計しています。そのため回数と出典は常に一致します。</p>
      </section>

      <section className="card">
        <h2>扱わない情報</h2>
        <ul>
          <li>仲の良し悪し、不仲説、恋愛関係の推測</li>
          <li>「前世」「中の人」に関する情報、およびそれを示唆する関係</li>
          <li>出典が切り抜き動画・まとめサイト・匿名掲示板のみのもの</li>
          <li>本人がメンバー限定配信など非公開の場で話した内容</li>
          <li>炎上・不祥事(卒業・契約解除は公式発表の事実のみ記載します)</li>
          <li>年齢に関わる個人情報</li>
        </ul>
      </section>

      <section className="card">
        <h2>画像について</h2>
        <p>立ち絵・サムネイルなどの画像はサイト上に保存しません。各事務所の二次利用ガイドラインで許可された範囲でのみ表示し、基本はテキストで表示します。</p>
      </section>

      <section className="card">
        <h2>誤りの報告・削除のご依頼</h2>
        <p>
          すべての関係に出典を付け、<Link to="/changes">変更履歴</Link>を公開しています。誤りの報告は原則7日以内の対応を目標にしています。
        </p>
        <p>
          ご本人・事務所からの掲載停止・削除のご依頼は、本人確認の上で優先して対応します。<Link to="/submit?type=removal">依頼フォーム</Link>からご連絡ください。
        </p>
      </section>
    </div>
  );
}
