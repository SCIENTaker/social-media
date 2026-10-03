export function formatDate(d: string | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${y}/${m}/${day}`;
}

/** 2人の関係ビューの固定URL(ID順に正規化して同じURLになるようにする) */
export function pairPath(a: string, b: string): string {
  return a < b ? `/pair/${a}/${b}` : `/pair/${b}/${a}`;
}
