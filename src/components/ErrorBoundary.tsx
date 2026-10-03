import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

const RELOAD_KEY = 'tsunagari:chunk-reload';

/** 分割したファイルの読み込み失敗(再デプロイ直後の古いページなど)か */
function isChunkError(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message);
}

/** 表示中にエラーが起きても画面を真っ白にせず、再読み込みを案内する */
interface Props {
  children: ReactNode;
  /** true なら、ページ全体ではなくその部分だけに小さく案内を出す */
  compact?: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // 古いファイルを参照していた場合は自動で再読み込みする。
    // 直近30秒以内に再読み込み済みなら、無限ループを避けるため案内表示だけにする
    if (isChunkError(error)) {
      try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
        if (Date.now() - last > 30_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          location.reload();
        }
      } catch {
        // sessionStorage が使えない環境では案内表示のみ
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.compact)
      return (
        <div className="graph graph-loading">
          <span>
            関係図を読み込めませんでした。{' '}
            <button className="button secondary" onClick={() => location.reload()}>
              再読み込み
            </button>
          </span>
        </div>
      );
    return (
      <div className="container main">
        <section className="card">
          <h1>ページを表示できませんでした</h1>
          <p className="muted">通信状態やサイトの更新が原因の可能性があります。再読み込みをお試しください。</p>
          <p className="muted small">{this.state.error.message}</p>
          <div className="hero-links" style={{ justifyContent: 'flex-start' }}>
            <button className="button" onClick={() => location.reload()}>
              再読み込み
            </button>
            <a className="button secondary" href="#/" onClick={() => setTimeout(() => location.reload())}>
              トップへ戻る
            </a>
          </div>
        </section>
      </div>
    );
  }
}
