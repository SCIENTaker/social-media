import { describe, expect, it } from 'vitest';
import { Db } from '../src/lib/db';
import { dataset } from '../src/data';
import { validateDataset } from '../src/lib/validate';
import { normalize } from '../src/lib/text';
import type { Dataset } from '../src/lib/types';

const src = (id: string) => ({ id, url: `https://example.com/${id}`, kind: 'archive' as const, retrieved: '2026-01-01' });
const person = (id: string, extra = {}) => ({
  id, name: id.toUpperCase(), kana: id, aliases: [], kind: 'vtuber' as const, status: 'active' as const,
  links: [{ label: 'YouTube', url: `https://youtube.com/@${id}` }], bio: '', ...extra,
});

function fixture(): Dataset {
  return {
    persons: [person('a'), person('b', { aliases: ['旧ビー'] }), person('c'), person('d'), person('x', { visibility: 'basic-only' })],
    orgs: [{ id: 'o', name: 'O', kind: 'agency' }],
    memberships: [
      { personId: 'a', orgId: 'o', start: '2020-01-01', sourceIds: ['s1'] },
      { personId: 'b', orgId: 'o', start: '2020-01-01', sourceIds: ['s1'] },
      { personId: 'd', orgId: 'o', start: '2018-01-01', end: '2019-01-01', sourceIds: ['s1'] },
    ],
    relations: [{ id: 'r1', a: 'c', b: 'a', type: 'creation', directed: true, label: 'デザイン', sourceIds: ['s2'] }],
    events: [
      { id: 'e1', kind: 'collab', title: '1', date: '2026-09-01', participants: ['a', 'b'], sourceIds: ['s3'] },
      { id: 'e2', kind: 'collab', title: '2', date: '2024-01-01', participants: ['a', 'b', 'x'], sourceIds: ['s3'] },
      { id: 'e3', kind: 'tournament', title: '3', date: '2026-08-01', participants: ['b', 'd'], sourceIds: ['s3'] },
    ],
    sources: [src('s1'), src('s2'), src('s3')],
    changes: [],
  };
}
const today = new Date('2026-10-01');

describe('Db.neighbors', () => {
  const db = new Db(fixture());

  it('共演回数をイベントから集計する', () => {
    const b = db.neighbors('a', 'all', today).find((e) => e.other.id === 'b')!;
    expect(b.count).toBe(2);
    expect(b.first).toBe('2024-01-01');
    expect(b.last).toBe('2026-09-01');
    expect([...b.categories].sort()).toEqual(['affiliation', 'collab']);
  });

  it('期間で絞り込める', () => {
    const b = db.neighbors('a', '3m', today).find((e) => e.other.id === 'b')!;
    expect(b.count).toBe(1);
  });

  it('所属期間が重ならない人は公式所属に含めない', () => {
    expect(db.neighbors('a', 'all', today).find((e) => e.other.id === 'd')).toBeUndefined();
  });

  it('制作関係を含める', () => {
    const c = db.neighbors('a', 'all', today).find((e) => e.other.id === 'c')!;
    expect(c.categories.has('creation')).toBe(true);
    expect(c.count).toBe(0);
  });

  it('関係情報が非公開の人物は出さない', () => {
    expect(db.neighbors('a', 'all', today).some((e) => e.other.id === 'x')).toBe(false);
    expect(db.neighbors('x', 'all', today)).toEqual([]);
    expect(db.visibleParticipants(db.event('e2')!).hiddenCount).toBe(1);
  });
});

describe('Db その他', () => {
  const db = new Db(fixture());

  it('旧名・カタカナでも検索できる', () => {
    expect(db.search('旧ビー')[0].id).toBe('b');
    expect(db.search('A')[0].id).toBe('a');
  });

  it('最短経路を探す', () => {
    const path = db.shortestPath('a', 'd')!;
    expect(path.map((s) => s.to)).toEqual(['b', 'd']);
    expect(db.shortestPath('a', 'c')).toBeUndefined();
  });

  it('共通の共演者を返す', () => {
    expect(db.commonCollaborators('a', 'd').map((c) => c.person.id)).toEqual(['b']);
  });
});

describe('validateDataset', () => {
  it('同梱データは整合している', () => {
    expect(validateDataset(dataset)).toEqual([]);
  });

  it('出典のない関係・存在しない人物を検出する', () => {
    const d = fixture();
    d.relations[0].sourceIds = [];
    d.events[0].participants = ['a', 'nobody'];
    const errors = validateDataset(d);
    expect(errors.some((e) => e.includes('出典が1件もありません'))).toBe(true);
    expect(errors.some((e) => e.includes('nobody'))).toBe(true);
  });

  it('掲示板などの出典を拒否する', () => {
    const d = fixture();
    d.sources[0].url = 'https://hayabusa.5ch.net/test/read.cgi/1';
    expect(validateDataset(d).some((e) => e.includes('認めていない'))).toBe(true);
  });
});

it('normalize はカタカナをひらがなにする', () => {
  expect(normalize('ホシノ ミナ')).toBe('ほしのみな');
});
