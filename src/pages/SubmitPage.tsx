import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTitle } from '../components/Layout';
import { SUBMIT_REPO } from '../config';
import { BLOCKED_SOURCE_HOSTS } from '../lib/validate';

type SubmitType = 'event' | 'relation' | 'correction' | 'removal';

const TYPE_LABELS: Record<SubmitType, string> = {
  event: 'コラボ配信・企画の追加',
  relation: '関係(制作・公言された関係)の追加',
  correction: '誤りの報告',
  removal: '掲載停止・削除の依頼(ご本人・事務所の方)',
};

/** 承認時にも確認するが、投稿段階で明らかに扱わない内容を弾く */
const FORBIDDEN = ['前世', '中の人', '中身', '魂', '転生前', '不仲', '付き合って', '交際', '炎上'];

export function SubmitPage() {
  useTitle('情報提供');
  const [params] = useSearchParams();
  const initialType = (Object.keys(TYPE_LABELS).includes(params.get('type') ?? '') ? params.get('type') : 'event') as SubmitType;
  const [type, setType] = useState<SubmitType>(initialType);
  const [people, setPeople] = useState('');
  const [detail, setDetail] = useState('');
  const [url, setUrl] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    const needsSource = type !== 'removal';
    if (!people.trim()) errs.push('対象の人物を入力してください。');
    if (!detail.trim()) errs.push('内容を入力してください。');
    if (needsSource) {
      let host = '';
      try {
        const u = new URL(url);
        if (!/^https?:$/.test(u.protocol)) throw new Error();
        host = u.hostname;
      } catch {
        errs.push('出典URLを正しく入力してください(出典は必須です)。');
      }
      if (host && BLOCKED_SOURCE_HOSTS.some((h) => host === h || host.endsWith('.' + h)))
        errs.push('まとめサイト・匿名掲示板は出典として受け付けていません。配信アーカイブ・公式発表・本人投稿のURLを入力してください。');
    }
    const hit = FORBIDDEN.filter((w) => (people + detail).includes(w));
    if (hit.length)
      errs.push(`「${hit.join('」「')}」に関する情報は扱っていません。コンテンツポリシーをご確認ください。`);
    if (!agree) errs.push('コンテンツポリシーへの同意が必要です。');
    setErrors(errs);
    if (errs.length) return;

    const body = [
      `### 種別\n${TYPE_LABELS[type]}`,
      `### 対象の人物\n${people}`,
      `### 内容\n${detail}`,
      needsSource ? `### 出典URL\n${url}` : '',
      '---\n- [x] コンテンツポリシーに同意しました',
    ]
      .filter(Boolean)
      .join('\n\n');
    const issue = new URL(`https://github.com/${SUBMIT_REPO}/issues/new`);
    issue.searchParams.set('title', `[${TYPE_LABELS[type]}] ${people}`.slice(0, 120));
    issue.searchParams.set('body', body);
    issue.searchParams.set('labels', `submission:${type}`);
    window.open(issue.toString(), '_blank', 'noopener');
  };

  return (
    <div className="stack narrow">
      <section className="card">
        <h1>情報提供</h1>
        <p>
          関係・イベントの追加や誤りの報告を受け付けています。いただいた情報は編集者が出典を確認し、承認したものだけを掲載します(自動で公開されることはありません)。
        </p>
        <div className="notice">
          <strong>受け付けない情報:</strong>「前世」「中の人」に関する情報や示唆、仲の良し悪し・不仲説・恋愛関係の推測、切り抜き動画・まとめサイト・匿名掲示板のみを根拠とする情報、メンバー限定配信など非公開の場での発言。
          詳しくは<Link to="/policy">コンテンツポリシー</Link>をご覧ください。
        </div>
      </section>

      <form className="card form" onSubmit={submit} noValidate>
        <label>
          種別
          <select value={type} onChange={(e) => setType(e.target.value as SubmitType)}>
            {(Object.keys(TYPE_LABELS) as SubmitType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          対象の人物 <span className="req">必須</span>
          <input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="例: 星野ミナ、天音ユズ" />
        </label>
        <label>
          内容 <span className="req">必須</span>
          <textarea
            rows={5}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={
              type === 'removal'
                ? 'ご依頼の内容と、ご本人・事務所であることを確認できる連絡先(公式アカウントなど)をご記入ください。'
                : '例: 2026/09/12 の配信で2人がコラボしました。'
            }
          />
        </label>
        {type !== 'removal' && (
          <label>
            出典URL <span className="req">必須</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="配信アーカイブ・公式発表・本人投稿のURL"
            />
          </label>
        )}
        <label className="inline">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          コンテンツポリシーに同意します
        </label>
        {errors.length > 0 && (
          <ul className="errors" role="alert">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <button type="submit" className="button">
          GitHub Issue として送信する
        </button>
        <p className="muted small">送信ボタンを押すと、入力内容を記入済みの GitHub Issue 作成画面が開きます。</p>
      </form>
    </div>
  );
}
