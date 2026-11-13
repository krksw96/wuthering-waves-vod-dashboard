import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeRows, parseTopics, parseSourceTimestamp } from '../scripts/lark-normalize.mjs';

test('main DB uses current metrics H/I, bilingual topics O, exact version B and source timestamp C2', async () => {
  const config = JSON.parse(await readFile(new URL('../config/source.json', import.meta.url), 'utf8'));
  const rows = Array.from({ length: 6 }, () => Array(27).fill(''));
  rows[1][2] = '2026-11-13 18:05';
  ['버전', '크리에이터', '영상 폼', '업로드 일자', '영상 제목', '링크', '좋아요 수', '조회수'].forEach((label, index) => { rows[4][index + 1] = label; });
  rows[4][14] = '内容主题\n콘텐츠 주제';
  Object.entries({ 1: 'V 3.7', 2: '검증 KOC', 3: '숏폼/短视频', 4: '2026-10-01 00:12:37', 5: '공략 영상', 6: 'https://youtu.be/abcdefghijk', 7: 136, 8: 14817, 14: '콘텐츠 공략\n玩法攻略,캐릭터 공략(여우의 별자리)\n角色攻略（心）', 20: 30, 21: 300, 24: '2026-11-13 18:05' }).forEach(([column, value]) => { rows[5][Number(column)] = value; });
  const result = normalizeRows(rows, config, { generatedAt: '2026-11-14T00:00:00Z' });
  const [video] = result.videos;
  assert.equal(video.views, 14817);
  assert.equal(video.likes, 136);
  assert.equal(video.version, 'V 3.7');
  assert.equal(video.format, 'Shorts');
  assert.deepEqual(video.topics, ['콘텐츠 공략', '캐릭터 공략(여우의 별자리)']);
  assert.equal(video.sourceRow, 6);
  assert.equal(video.date, '2026-10-01');
  assert.equal(result.metricUpdatedAt, '2026-11-13T09:05:00.000Z');
  assert.notEqual(result.metricUpdatedAt, result.generatedAt);
  rows[5][3] = '롱폼/长视频';
  assert.equal(normalizeRows(rows, config).videos[0].format, 'VOD');
});

test('topic translation does not become a duplicate topic; unknown single-language labels remain', () => {
  assert.deepEqual(parseTopics('기타\n其他（直播交流等）', { topicLanguage: 'ko' }), ['기타']);
  assert.deepEqual(parseTopics('새 주제\n新主题,새 주제\n新主题', { topicLanguage: 'ko' }), ['새 주제']);
  assert.deepEqual(parseTopics('New topic', { topicLanguage: 'ko' }), ['New topic']);
  assert.deepEqual(parseTopics('', { topicLanguage: 'ko' }), []);
});

test('source update timestamps preserve the declared source timezone and reject impossible times', () => {
  assert.equal(parseSourceTimestamp('2026-11-13 18:05'), '2026-11-13T09:05:00.000Z');
  assert.equal(parseSourceTimestamp('2026-11-13T18:05:00+08:00'), '2026-11-13T10:05:00.000Z');
  assert.equal(parseSourceTimestamp('2026-02-30 18:05'), null);
  assert.equal(parseSourceTimestamp('2026-11-13 24:05'), null);
});
