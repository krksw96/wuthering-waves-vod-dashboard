/** Pure analytics for upload cohorts. Metrics are latest cumulative observations. */
const DAY_MS = 86_400_000;
const numberFormat = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

function parsedDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

const iso = (date) => date.toISOString().slice(0, 10);
const metricValue = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const isSelected = (value) => value !== undefined && value !== null && value !== '' && value !== 'all';
const normalized = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko-KR');

export function getToday(timeZone = 'Asia/Seoul') {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Inclusive calendar ranges ending today. Month/year represent (anniversary, today]:
 * 2026-11-14 month -> 2026-10-15..2026-11-14. An anniversary is clamped to the last
 * real day of the target month before adding one day; no DST or leap-day overflow.
 */
export function getPeriodRange(preset, today = getToday()) {
  if (preset === 'all' || preset === 'custom') return { start: '', end: '' };
  const endDate = parsedDate(today);
  if (!endDate) throw new RangeError('기준일이 올바른 YYYY-MM-DD 날짜가 아닙니다.');
  if (preset === 'week') return { start: iso(new Date(endDate.getTime() - 6 * DAY_MS)), end: today };
  if (preset !== 'month' && preset !== 'year') throw new RangeError(`지원하지 않는 기간입니다: ${preset}`);
  const anniversary = new Date(endDate);
  const originalDay = anniversary.getUTCDate();
  anniversary.setUTCDate(1);
  anniversary.setUTCMonth(anniversary.getUTCMonth() - (preset === 'month' ? 1 : 12));
  const nextMonth = new Date(anniversary);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  nextMonth.setUTCDate(0);
  anniversary.setUTCDate(Math.min(originalDay, nextMonth.getUTCDate()));
  return { start: iso(new Date(anniversary.getTime() + DAY_MS)), end: today };
}

export function validateDateRange(start = '', end = '') {
  if (start && !parsedDate(start)) return { valid: false, error: '시작일을 올바른 날짜로 입력하세요.' };
  if (end && !parsedDate(end)) return { valid: false, error: '종료일을 올바른 날짜로 입력하세요.' };
  if (start && end && start > end) return { valid: false, error: '시작일은 종료일보다 늦을 수 없습니다.' };
  return { valid: true, error: null };
}

export function filterVideos(videos, filters = {}) {
  const { start = '', end = '', creator, topic, version, format, query = '' } = filters;
  if (!validateDateRange(start, end).valid) return [];
  const search = normalized(query).trim();
  return videos.filter((video) => {
    if ((start || end) && !parsedDate(video.date)) return false;
    if (start && video.date < start) return false;
    if (end && video.date > end) return false;
    if (isSelected(creator) && video.creator !== creator) return false;
    if (isSelected(topic) && !(video.topics || []).includes(topic)) return false;
    if (isSelected(version) && video.version !== version) return false;
    if (isSelected(format) && video.format !== format) return false;
    if (search && !normalized(video.title).includes(search) && !normalized(video.creator).includes(search)) return false;
    return true;
  });
}

export function summarize(videos) {
  let views = 0;
  let likes = 0;
  let viewsAvailable = 0;
  let likesAvailable = 0;
  let pairedViews = 0;
  let pairedLikes = 0;
  let likeRateVideos = 0;
  const creators = new Set();
  for (const video of videos) {
    if (video.creator) creators.add(video.creator);
    const viewCount = metricValue(video.views);
    const likeCount = metricValue(video.likes);
    if (viewCount !== null) { views += viewCount; viewsAvailable += 1; }
    if (likeCount !== null) { likes += likeCount; likesAvailable += 1; }
    if (viewCount !== null && likeCount !== null) {
      pairedViews += viewCount;
      pairedLikes += likeCount;
      likeRateVideos += 1;
    }
  }
  return {
    count: videos.length,
    creatorCount: creators.size,
    views: viewsAvailable ? views : null,
    likes: likesAvailable ? likes : null,
    viewsAvailable,
    likesAvailable,
    viewsMissing: videos.length - viewsAvailable,
    likesMissing: videos.length - likesAvailable,
    likeRate: pairedViews > 0 ? pairedLikes / pairedViews * 100 : null,
    likeRateVideos,
  };
}

function aggregateGroups(videos, keysFor, field) {
  const groups = new Map();
  for (const video of videos) {
    for (const key of new Set(keysFor(video))) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(video);
    }
  }
  return [...groups].map(([key, rows]) => ({ [field]: key, ...summarize(rows) }))
    .sort((a, b) => (b.views ?? -1) - (a.views ?? -1) || b.count - a.count || a[field].localeCompare(b[field], 'ko-KR'));
}

export function groupByCreator(videos) {
  return aggregateGroups(videos, (video) => [video.creator || '미확인 KOC'], 'creator');
}

/** Multi-topic videos belong to each topic once; topic totals can overlap. */
export function groupByTopic(videos) {
  return aggregateGroups(videos, (video) => {
    const topics = Array.isArray(video.topics) ? video.topics.filter((topic) => typeof topic === 'string' && topic.trim()) : [];
    return topics.length ? topics : ['미분류'];
  }, 'topic');
}

/** Latest cumulative metrics grouped by upload day, never views gained that day. */
export function buildTrend(videos, metric = 'views') {
  if (!['count', 'views', 'likes'].includes(metric)) throw new RangeError(`지원하지 않는 지표입니다: ${metric}`);
  const days = new Map();
  for (const video of videos) {
    if (!parsedDate(video.date)) continue;
    if (!days.has(video.date)) days.set(video.date, []);
    days.get(video.date).push(video);
  }
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => {
    const summary = summarize(rows);
    return { date, count: summary.count, views: summary.views, likes: summary.likes, value: summary[metric] };
  });
}

export function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}

export function formatNumber(value) {
  return metricValue(value) === null ? '—' : numberFormat.format(value);
}

function csvCell(value) {
  let text = String(value ?? '');
  // Excel may ignore leading whitespace/control characters before a formula marker.
  if (/^[\s\u0000-\u001f]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(videos) {
  const headers = ['영상 ID', 'KOC', '영상 제목', '링크', '게시일', '버전', '형식', '콘텐츠 주제', '조회수', '좋아요'];
  const rows = videos.map((video) => [
    video.id, video.creator, video.title, safeUrl(video.url), video.date,
    video.version, video.format, [...new Set(video.topics || [])].join(' · '),
    metricValue(video.views), metricValue(video.likes),
  ]);
  return `\ufeff${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
