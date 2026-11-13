// A separately identified preview from an existing local dataset. This does NOT read the requested Lark sheet.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceCandidates = [resolve(root, '..', 'data', 'wuthering-waves.js'), resolve(root, '..', 'wuthering-waves-vod-dashboard', 'data', 'wuthering-waves.js')];
let text;
for (const path of sourceCandidates) {
  try { text = await readFile(path, 'utf8'); break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
if (!text) throw new Error('Existing local preview source is unavailable');
const marker = 'window.GAME_DATA["wuthering-waves"] = ';
if (!text.includes(marker)) throw new Error('Unknown existing dataset format');
const source = JSON.parse(text.slice(text.indexOf(marker) + marker.length).trim().replace(/;$/, ''));
const relevant = /명조|워더링\s*웨이브|wuthering\s*waves/i;
function topics(title) {
  const matches = [
    [/공략|가이드|세팅|셋팅|빌드|에코|운용|꿀팁|성능|분석/, '공략 · 분석'],
    [/스토리|스포|서사|퀘스트/, '스토리'],
    [/가챠|뽑기|픽업|천장|풀돌|풀체인/, '가챠 · 소환'],
    [/리액션|반응|감상/, '리액션'],
    [/방송|다시보기|생방|라이브/, '라이브 · 다시보기'],
    [/업데이트|패치|신캐|신규|소식|정보/, '업데이트 · 소식'],
  ].filter(([regex]) => regex.test(title)).map(([, topic]) => topic);
  return matches.length ? matches : ['기타'];
}
const videos = source.videos.filter(v => v.isKoc && relevant.test(v.title) && /^\d{4}-\d{2}-\d{2}$/.test(v.date)).map(v => ({
  id: v.id,
  creator: v.kocName || v.creator,
  title: v.title,
  url: v.url,
  date: v.date,
  views: Number.isFinite(v.views) && v.views >= 0 ? v.views : null,
  likes: Number.isFinite(v.likes) && v.likes >= 0 ? v.likes : null,
  topics: topics(v.title),
  version: null,
  format: v.format || '미분류',
}));
if (!videos.length) throw new Error('Existing KOC preview has no relevant rows');
const dates = videos.map(v => v.date).sort();
const payload = {
  schemaVersion: 1,
  mode: 'preview',
  source: {
    label: '명조 KOC 원본 시트',
    url: 'https://ojpvaupdkdbj.jp.larksuite.com/wiki/TjncwLOoOi0Ds2kBpiKjKetSpH4?sheet=4z1yjS',
    sheetId: '4z1yjS',
    status: 'awaiting-permission',
    provenance: {
      label: '기존 명조 VOD 대시보드의 KOC 영상 중 제목에 명조·워더링 웨이브가 있는 영상',
      url: 'https://krksw96.github.io/wuthering-waves-vod-dashboard/dashboard.html?game=wuthering-waves',
      generatedAt: source.generatedAt,
    },
  },
  generatedAt: source.generatedAt,
  coverage: { start: dates[0], end: dates.at(-1) },
  videos,
  versions: [],
  warnings: [
    '요청한 Lark 원본의 데이터가 아닙니다. 원본 읽기 권한 연결을 기다리는 동안 기존 로컬 수집 데이터로 화면을 미리 보여줍니다.',
    '미리보기의 주제는 영상 제목의 키워드로 분류했습니다. 원본 연결 후에는 시트에 등록된 주제를 사용합니다.',
    '기존 수집 데이터에는 버전 정보가 없어 버전은 미지정입니다. 원본 버전 열 또는 확인된 버전 기간을 설정하면 버전 필터가 활성화됩니다.',
  ],
};
await writeFile(resolve(root, 'data', 'koc-data.json'), `${JSON.stringify(payload)}\n`, 'utf8');
console.log(JSON.stringify({ mode: payload.mode, videos: videos.length, creators: new Set(videos.map(v => v.creator)).size, coverage: payload.coverage, generatedAt: payload.generatedAt }));
