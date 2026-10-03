/** サイト全体の設定。サイト名やリポジトリは未決事項なので仮置き */
export const SITE_NAME = 'つながりDB';
export const SITE_TAGLINE = '配信者・VTuberの「誰と誰がどうつながっているか」を、出典付きで。';

/** 情報提供フォームの送信先(GitHub Issue)。運用するリポジトリに合わせて変更する */
export const SUBMIT_REPO = 'scientaker/social-media';

/** 関係図に一度に表示する最大人数(仕様: 最大30人) */
export const GRAPH_MAX_NODES = 30;

/**
 * データの状態についての注意書き(空文字なら表示しない)。
 * 現在のデータは報道記事を暫定の出典にした仮データのため表示している。
 */
export const DATA_NOTICE =
  '現在のデータは公開報道をもとにした仮データです。出典を一次情報(公式発表・配信アーカイブ)へ差し替える作業中のため、誤りがあれば情報提供フォームからお知らせください。';
