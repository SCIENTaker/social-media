import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

// URL は「/#/p/人物ID」の形にする。サーバー側の設定(すべてのパスで index.html を返す設定)が
// なくても、どの静的ホスティング・サブディレクトリでもページ遷移・再読み込み・共有URLが動く。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
);
