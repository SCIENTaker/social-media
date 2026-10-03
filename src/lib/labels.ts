import type { EventKind, OrgKind, PersonKind, PersonStatus, RelationCategory, SourceKind } from './types';

export const CATEGORY_LABELS: Record<RelationCategory, string> = {
  affiliation: '公式所属',
  collab: '共演',
  project: '企画・大会',
  creation: '制作',
  declared: '公言された関係',
};

/** 分類ごとに線の色を固定する(ライト/ダーク両方で判別できる中間色) */
export const CATEGORY_COLORS: Record<RelationCategory, string> = {
  affiliation: '#8a8f98',
  collab: '#2f7de1',
  project: '#e8871e',
  creation: '#9b59d0',
  declared: '#d6457a',
};

export const CATEGORY_ORDER: RelationCategory[] = ['affiliation', 'collab', 'project', 'creation', 'declared'];

export const KIND_LABELS: Record<PersonKind, string> = {
  vtuber: 'VTuber',
  streamer: '配信者',
  creator: 'クリエイター',
};

export const STATUS_LABELS: Record<PersonStatus, string> = {
  active: '活動中',
  hiatus: '休止中',
  retired: '卒業・引退',
};

export const ORG_KIND_LABELS: Record<OrgKind, string> = {
  agency: '事務所',
  group: 'グループ',
  unit: 'ユニット',
  team: 'チーム',
};

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  collab: 'コラボ配信',
  song: '歌・動画',
  project: '企画',
  tournament: '大会',
};

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  archive: '配信アーカイブ',
  official: '公式発表',
  post: '本人投稿',
};
