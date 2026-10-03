import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DATA_NOTICE, SITE_NAME } from '../config';

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo">
            <span className="logo-mark" aria-hidden>◎</span>
            {SITE_NAME}
          </Link>
          <nav className="nav">
            <NavLink to="/pair">2人の関係</NavLink>
            <NavLink to="/path">経路検索</NavLink>
            <NavLink to="/submit">情報提供</NavLink>
            <NavLink to="/policy">ポリシー</NavLink>
          </nav>
        </div>
      </header>
      {DATA_NOTICE && <div className="sample-banner">{DATA_NOTICE}</div>}
      <main className="container main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <p>
            すべての関係は公開情報の出典にもとづいて掲載しています。「前世」「中の人」に関する情報、仲の良し悪しなど主観的な関係は扱いません。
          </p>
          <p>
            <Link to="/policy">掲載基準・コンテンツポリシー</Link> ・ <Link to="/changes">変更履歴</Link> ・{' '}
            <Link to="/submit?type=removal">掲載停止・削除のご依頼</Link>
          </p>
        </div>
      </footer>
    </>
  );
}

/** ページタイトルを設定する(SNS共有時に分かりやすくするため) */
export function useTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
