/** 検索用の正規化: 全角半角の統一、小文字化、カタカナ→ひらがな、空白除去 */
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・]/g, '');
}
