// データモデル(仕様書「データモデル」節に対応)

export type PersonKind = 'vtuber' | 'streamer' | 'creator';
export type PersonStatus = 'active' | 'hiatus' | 'retired';

export interface Link {
  label: string;
  url: string;
}

export interface Person {
  id: string;
  name: string;
  /** 読み(ひらがな) */
  kana: string;
  /** 別名・旧名。改名時はここに旧名を残す */
  aliases: string[];
  kind: PersonKind;
  status: PersonStatus;
  debut?: string;
  links: Link[];
  bio: string;
  /**
   * 関係情報の公開状態。
   * "basic-only" は引退後に関係情報の非公開を求めた人物向けで、基本情報のみ表示する。
   */
  visibility?: 'public' | 'basic-only';
}

export type OrgKind = 'agency' | 'group' | 'unit' | 'team';

export interface Org {
  id: string;
  name: string;
  kind: OrgKind;
  company?: string;
  start?: string;
  url?: string;
  /** 親組織(ユニットが所属する事務所など) */
  parent?: string;
}

export interface Membership {
  personId: string;
  orgId: string;
  /** 期生・メンバー等 */
  role?: string;
  start?: string;
  /** 移籍・卒業は終了日で表現する */
  end?: string;
  sourceIds: string[];
}

/**
 * 関係テーブルに直接書く種別。
 * 「公式所属」は所属テーブルから、「共演」「企画・大会」はイベントから自動で集計するため、ここには書かない。
 */
export type ManualRelationType = 'creation' | 'declared';

export interface Relation {
  id: string;
  a: string;
  b: string;
  type: ManualRelationType;
  /** true なら A→B(例: 絵師 → 担当ライバー) */
  directed: boolean;
  label: string;
  start?: string;
  end?: string;
  sourceIds: string[];
}

export type EventKind = 'collab' | 'song' | 'project' | 'tournament' | 'live';

export interface EventTeam {
  name: string;
  members: string[];
}

export interface StreamEvent {
  id: string;
  kind: EventKind;
  title: string;
  date: string;
  /** 主催(人物IDまたは組織ID) */
  host?: string;
  /** 主催が未掲載の人物・団体の場合の表示名 */
  hostName?: string;
  participants: string[];
  teams?: EventTeam[];
  sourceIds: string[];
}

/** news は公式発表を報じた報道記事(一次出典に差し替えるまでの暫定) */
export type SourceKind = 'archive' | 'official' | 'post' | 'news';

export interface Source {
  id: string;
  url: string;
  kind: SourceKind;
  /** 取得日 */
  retrieved: string;
  archiveUrl?: string;
  /** 出典の見出し・補足 */
  title?: string;
}

export interface ChangeLogEntry {
  date: string;
  target: string;
  summary: string;
  editor: string;
  approver: string;
}

/** 図・フィルタで使う関係分類(5分類) */
export type RelationCategory = 'affiliation' | 'collab' | 'project' | 'creation' | 'declared';

export interface Dataset {
  persons: Person[];
  orgs: Org[];
  memberships: Membership[];
  relations: Relation[];
  events: StreamEvent[];
  sources: Source[];
  changes: ChangeLogEntry[];
}
