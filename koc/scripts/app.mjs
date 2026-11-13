import {
  getToday, getPeriodRange, filterVideos, summarize, groupByCreator, groupByTopic,
  buildTrend, toCsv, safeUrl, formatNumber, validateDateRange,
} from './analytics.mjs';

const $ = (id) => document.getElementById(id);
const SOURCE_URL = 'https://ojpvaupdkdbj.jp.larksuite.com/wiki/TjncwLOoOi0Ds2kBpiKjKetSpH4?sheet=4z1yjS';
const PAGE_SIZE = 20;
const METRICS = { views: '조회수', likes: '좋아요', count: '영상 수' };
const state = { payload: null, filtered: [], page: 1, period: 'all', metric: 'views', loading: false };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const validMetric = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const formatDate = (value) => value ? String(value).replaceAll('-', '.') : '미확인';
const normalizeText = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko-KR').trim();
const shortNumber = (value) => {
  if (!validMetric(value)) return '—';
  if (value >= 100_000_000) return `${(value / 100_000_000).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}억`;
  if (value >= 100_000) return `${(value / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`;
  return formatNumber(value);
};
const metricLong = (key) => key === 'count' ? '영상 수' : `누적 ${METRICS[key]}`;
const timeLabel = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul',
  }).format(date) : '미확인';
};
const sourceTimeLabel = (value) => {
  if (typeof value !== 'string' || !value.trim()) return '원본에 갱신 시각 없음';
  // A source-local timestamp has no established time zone. Keep that wall-clock
  // value instead of silently treating it as the viewer's local time or KST.
  const local = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (local) return `${formatDate(local[1])} ${local[2]} · 원본 표기`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${formatDate(value)} · 원본 표기`;
  return `${timeLabel(value)} KST`;
};

function syncDescription(sync) {
  if (sync?.enabled !== true) return '자동 동기화 설정 대기 · 현재는 마지막으로 읽은 원본을 표시합니다.';
  const interval = validMetric(sync.intervalHours) && sync.intervalHours > 0 ? `${sync.intervalHours}시간마다 원본 확인` : '원본 자동 확인 사용 중';
  return `${interval}${sync.requiresComputer === true ? ' · 이 PC가 켜져 있고 사용자 로그인 상태일 때 실행' : ''}`;
}

function filters() {
  return {
    start: $('start-date').value, end: $('end-date').value,
    creator: $('creator-filter').value, topic: $('topic-filter').value,
    version: $('version-filter').value, format: $('format-filter').value, query: $('query').value.trim(),
  };
}

function replaceOptions(element, options, placeholder) {
  const selected = element.value;
  element.replaceChildren(new Option(placeholder, ''), ...options.map(({ value, label }) => new Option(label, value)));
  if (options.some(({ value }) => value === selected)) element.value = selected;
}

function populateCreators() {
  if (!state.payload) return;
  const search = normalizeText($('creator-search').value);
  const selected = $('creator-filter').value;
  const creators = [...new Set(state.payload.videos.map((video) => video.creator).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const matching = creators.filter((creator) => normalizeText(creator).includes(search) || creator === selected);
  replaceOptions($('creator-filter'), matching.map((creator) => ({ value: creator, label: creator })), search ? `검색 결과 ${matching.length}명 · 선택` : `전체 KOC (${creators.length}명)`);
  $('creator-filter').setAttribute('aria-description', search ? `${matching.length}명의 검색 결과 중 분석할 KOC를 선택하세요.` : '하나의 KOC를 선택하거나 전체 KOC를 분석합니다.');
}

function populateFilters() {
  const { videos, versions = [] } = state.payload;
  populateCreators();
  const topics = [...new Set(videos.flatMap((video) => video.topics))].sort((a, b) => a.localeCompare(b, 'ko'));
  replaceOptions($('topic-filter'), topics.map((topic) => ({ value: topic, label: topic })), '전체 주제');
  const formats = [...new Set(videos.map((video) => video.format).filter(Boolean))].sort();
  replaceOptions($('format-filter'), formats.map((format) => ({ value: format, label: format })), '전체 형식');
  const versionMap = new Map(versions.filter((version) => version?.id).map((version) => [String(version.id), version]));
  for (const video of videos) if (video.version && !versionMap.has(video.version)) versionMap.set(video.version, { id: video.version, label: video.version });
  const versionOptions = [...versionMap.values()].sort((a, b) => String(b.id).localeCompare(String(a.id), 'ko', { numeric: true }));
  replaceOptions($('version-filter'), versionOptions.map((version) => ({ value: String(version.id), label: String(version.label || version.id) })), versionOptions.length ? '전체 버전' : '버전 정보 연결 대기');
  $('version-filter').disabled = versionOptions.length === 0;
  $('version-filter').title = versionOptions.length ? '원본에 등록된 버전을 선택합니다.' : '원본 버전 열 또는 확인된 버전 기간을 연결하면 선택할 수 있습니다.';
}

function renderSource() {
  const { mode, source, generatedAt, importedAt, syncedAt, metricUpdatedAt, sync, coverage, warnings = [] } = state.payload;
  const isImported = mode === 'live' && source?.status === 'imported';
  const isLive = mode === 'live' && !isImported;
  $('status-pill').classList.toggle('live', isLive);
  $('status-pill').innerHTML = `<i></i>${isImported ? '내보내기 데이터 · 연결 대기' : isLive ? 'Lark 원본 데이터' : '미리보기 · 연결 대기'}`;
  $('source-notice').classList.toggle('live', isLive);
  $('source-notice-title').textContent = isImported ? '원본 내보내기 데이터 · 자동 연결 대기' : isLive ? 'Lark 원본 시트에서 수집한 데이터' : '기존 수집 데이터 미리보기 · 요청한 Lark 원본 연결 대기';
  const provenance = source?.provenance;
  const provenanceUrl = safeUrl(provenance?.url);
  const description = isImported
    ? `원본에서 내보낸 파일을 ${timeLabel(importedAt || generatedAt)} KST에 가져왔습니다. 지표는 파일에 저장된 값이며, 자동 동기화는 연결 대기 중입니다. 화면은 5분마다 새 데이터 파일을 확인합니다.`
    : isLive
    ? `${syncDescription(sync)} 화면은 5분마다 새 데이터 파일을 확인합니다.`
    : `요청한 시트의 데이터가 아닙니다. ${provenance?.label || '기존 로컬 수집 데이터'}로 기능을 미리 보여줍니다. 버전 정보는 원본 연결 후 표시합니다.`;
  $('source-notice-body').innerHTML = `${esc(description)}${provenanceUrl && mode === 'preview' ? ` <a href="${esc(provenanceUrl)}" target="_blank" rel="noopener noreferrer">미리보기 출처 ↗</a>` : ''}${warnings.length ? `<br>${esc(warnings.join(' · '))}` : ''}`;
  $('collected-at').textContent = isImported
    ? `파일 가져옴 ${timeLabel(importedAt || generatedAt)} KST · 자동 연결 대기`
    : isLive ? `원본 지표 갱신 ${sourceTimeLabel(metricUpdatedAt)}` : `데이터 수집 ${timeLabel(generatedAt)} KST · 미리보기 스냅샷`;
  $('source-metadata').hidden = !isLive;
  $('metric-updated-at').textContent = sourceTimeLabel(metricUpdatedAt);
  $('site-synced-at').textContent = `${timeLabel(syncedAt || generatedAt)} KST`;
  $('synced-at').hidden = !isLive;
  $('synced-at').textContent = `사이트 동기화 ${timeLabel(syncedAt || generatedAt)} KST`;
  const freshness = [];
  const now = Date.now();
  // Only calculate elapsed hours when the timestamp carries its own zone.
  if (isLive && typeof metricUpdatedAt === 'string' && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(metricUpdatedAt)) {
    const hours = (now - Date.parse(metricUpdatedAt)) / 3_600_000;
    if (Number.isFinite(hours) && hours >= 72) freshness.push(`원본 지표가 ${Math.floor(hours / 24)}일 전 갱신된 값입니다. 사이트 동기화는 원본 수치를 다시 읽는 작업입니다.`);
  }
  if (isLive && sync?.enabled === true && validMetric(sync.intervalHours) && sync.intervalHours > 0) {
    const hours = (now - Date.parse(syncedAt || generatedAt)) / 3_600_000;
    if (Number.isFinite(hours) && hours > sync.intervalHours * 2) freshness.push('예정된 확인 간격보다 사이트 동기화가 늦어졌습니다. 마지막으로 정상 수집한 데이터를 표시합니다.');
  }
  $('source-freshness').hidden = freshness.length === 0;
  $('source-freshness').textContent = freshness.join(' ');
  $('coverage-note').textContent = coverage?.start && coverage?.end ? `수집 범위 ${formatDate(coverage.start)} — ${formatDate(coverage.end)}` : '수집 범위 미확인';
  document.querySelectorAll('a[href*="TjncwLOoOi0Ds2kBpiKjKetSpH4"]').forEach((link) => { link.href = safeUrl(source?.url) || SOURCE_URL; });
}

function setPeriod(preset) {
  state.period = preset;
  document.querySelectorAll('[data-period]').forEach((button) => {
    const selected = button.dataset.period === preset;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (preset !== 'custom') {
    const range = getPeriodRange(preset, getToday('Asia/Seoul'));
    $('start-date').value = range.start;
    $('end-date').value = range.end;
  } else if (!$('start-date').value && !$('end-date').value && state.payload?.coverage) {
    $('start-date').value = state.payload.coverage.start || '';
    $('end-date').value = state.payload.coverage.end || '';
  }
  render();
}

function renderMetrics(rows) {
  const summary = summarize(rows);
  const formats = new Map();
  rows.forEach((row) => formats.set(row.format || '형식 미확인', (formats.get(row.format || '형식 미확인') || 0) + 1));
  $('metric-videos').textContent = formatNumber(summary.count);
  $('metric-video-note').textContent = [...formats].map(([format, count]) => `${format} ${formatNumber(count)}`).join(' · ') || '선택한 조건의 영상';
  $('metric-views').textContent = shortNumber(summary.views);
  $('metric-views').title = `정확한 누적 조회수: ${formatNumber(summary.views)}`;
  $('metric-views-note').textContent = summary.viewsMissing ? `${formatNumber(summary.viewsAvailable)} / ${formatNumber(summary.count)}개 영상 수치 공개` : `${formatNumber(summary.views)}회 · 확인 가능한 합계`;
  $('metric-likes').textContent = shortNumber(summary.likes);
  $('metric-likes').title = `정확한 누적 좋아요: ${formatNumber(summary.likes)}`;
  $('metric-likes-note').textContent = summary.likesMissing ? `${formatNumber(summary.likesAvailable)} / ${formatNumber(summary.count)}개 영상 수치 공개` : `${formatNumber(summary.likes)}개 · 확인 가능한 합계`;
  $('metric-rate').textContent = summary.likeRate === null ? '—' : `${summary.likeRate.toLocaleString('ko-KR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%`;
  $('metric-rate').title = `조회수·좋아요가 모두 공개된 ${formatNumber(summary.likeRateVideos)}개 영상의 합계로 계산`;
  $('metric-creators').textContent = formatNumber(summary.creatorCount);
}

function trendBuckets(rows) {
  const days = buildTrend(rows, state.metric);
  if (!days.length) return { buckets: [], monthly: false };
  const span = (Date.parse(days.at(-1).date) - Date.parse(days[0].date)) / 86_400_000;
  const monthly = span > 90;
  const grouped = new Map();
  for (const day of days) {
    const key = monthly ? day.date.slice(0, 7) : day.date;
    if (!grouped.has(key)) grouped.set(key, { date: key, value: null, count: 0 });
    const bucket = grouped.get(key);
    bucket.count += day.count;
    if (day.value !== null) bucket.value = (bucket.value ?? 0) + day.value;
  }
  const start = new Date(`${days[0].date}T00:00:00Z`);
  const end = new Date(`${days.at(-1).date}T00:00:00Z`);
  if (monthly) { start.setUTCDate(1); end.setUTCDate(1); }
  const buckets = [];
  for (const cursor = new Date(start); cursor <= end; monthly ? cursor.setUTCMonth(cursor.getUTCMonth() + 1) : cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, monthly ? 7 : 10);
    buckets.push(grouped.get(date) || { date, value: 0, count: 0 });
  }
  return { buckets, monthly };
}

function renderTrend(rows) {
  const { buckets, monthly } = trendBuckets(rows);
  $('chart-legend').textContent = metricLong(state.metric);
  $('trend-description').textContent = `${monthly ? '월' : '일'}별 업로드 영상의 ${state.metric === 'count' ? '개수' : `${metricLong(state.metric)} 합계`}`;
  $('trend-bucket-label').textContent = `${monthly ? '월' : '일'} 단위 · 업로드일 기준`;
  const metricUnavailable = state.metric !== 'count' && summarize(rows)[state.metric] === null;
  if (!buckets.length || metricUnavailable || buckets.every((bucket) => bucket.value === null)) {
    $('trend-chart').innerHTML = `<p class="chart-empty">${rows.length ? '이 조건에서 확인 가능한 지표가 없습니다.' : '선택한 조건의 영상이 없습니다.'}</p>`;
    return;
  }
  const width = Math.max(300, $('trend-chart').clientWidth - 32), height = 225, left = 53, right = 15, top = 14, bottom = 29;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const max = Math.max(1, ...buckets.map(({ value }) => value ?? 0));
  const ceiling = Math.ceil(max / (10 ** Math.floor(Math.log10(max)))) * (10 ** Math.floor(Math.log10(max)));
  const x = (index) => left + (buckets.length === 1 ? plotWidth / 2 : index / (buckets.length - 1) * plotWidth);
  const y = (value) => top + plotHeight - value / ceiling * plotHeight;
  const parts = [];
  for (let tick = 0; tick <= 4; tick += 1) {
    const value = ceiling * tick / 4;
    parts.push(`<line class="grid-line" x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}"/><text x="${left - 12}" y="${y(value) + 3}" text-anchor="end">${esc(shortNumber(value))}</text>`);
  }
  const runs = [];
  let current = [];
  buckets.forEach((bucket, index) => {
    if (bucket.value === null) { if (current.length) runs.push(current); current = []; }
    else current.push({ ...bucket, index });
  });
  if (current.length) runs.push(current);
  for (const run of runs) {
    const points = run.map((bucket) => `${x(bucket.index)},${y(bucket.value)}`).join(' ');
    if (run.length > 1) {
      const firstX = x(run[0].index), lastX = x(run.at(-1).index), bottomY = top + plotHeight;
      parts.push(`<polygon points="${firstX},${bottomY} ${points} ${lastX},${bottomY}" fill="url(#trend-gradient)"/><polyline class="trend-line" points="${points}"/>`);
    }
    if (buckets.length <= 35 || run.length === 1) for (const bucket of run) parts.push(`<circle class="chart-point" cx="${x(bucket.index)}" cy="${y(bucket.value)}" r="${buckets.length === 1 ? 4 : 2.5}"><title>${esc(bucket.date)} · ${esc(METRICS[state.metric])} ${esc(formatNumber(bucket.value))} · 영상 ${esc(formatNumber(bucket.count))}개</title></circle>`);
  }
  const tickCount = Math.min(width < 430 ? 4 : 6, buckets.length);
  const tickIndices = [...new Set(Array.from({ length: tickCount }, (_, index) => Math.round(index * (buckets.length - 1) / Math.max(1, tickCount - 1))))];
  for (const index of tickIndices) {
    const date = buckets[index].date;
    const label = monthly ? date.replace('-', '.') : date.slice(5).replace('-', '/');
    parts.push(`<text x="${x(index)}" y="${height - 7}" text-anchor="middle">${esc(label)}</text>`);
  }
  $('trend-chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc($('trend-description').textContent)}. ${esc(formatDate(buckets[0].date))}부터 ${esc(formatDate(buckets.at(-1).date))}까지."><defs><linearGradient id="trend-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#d4ee89" stop-opacity=".22"/><stop offset="100%" stop-color="#d4ee89" stop-opacity="0"/></linearGradient></defs>${parts.join('')}</svg>`;
}

function renderTopics(rows) {
  const groups = groupByTopic(rows).sort((a, b) => (b[state.metric] ?? -1) - (a[state.metric] ?? -1)).slice(0, 6);
  if (!groups.length) { $('topic-chart').innerHTML = '<p class="chart-empty">선택한 조건의 주제가 없습니다.</p>'; return; }
  const max = Math.max(1, ...groups.map((group) => group[state.metric] ?? 0));
  $('topic-chart').innerHTML = groups.map((group) => `<button type="button" class="topic-row${group.topic === $('topic-filter').value ? ' selected' : ''}" data-topic="${esc(group.topic)}" aria-label="${esc(group.topic)} 주제 선택 · ${esc(METRICS[state.metric])} ${esc(formatNumber(group[state.metric]))}"><span class="topic-top"><span class="topic-label">${esc(group.topic)}</span><span class="topic-value">${esc(shortNumber(group[state.metric]))}</span></span><span class="topic-bar"><span style="width:${Math.max(0, (group[state.metric] ?? 0) / max * 100).toFixed(2)}%"></span></span></button>`).join('');
}

function renderCreators(rows) {
  const groups = groupByCreator(rows).sort((a, b) => (b[state.metric] ?? -1) - (a[state.metric] ?? -1)).slice(0, 8);
  $('ranking-label').textContent = `${METRICS[state.metric]} 기준 · 상위 ${Math.min(8, groups.length)}명`;
  if (!groups.length) { $('creator-ranking').innerHTML = '<p class="chart-empty">선택한 조건의 KOC가 없습니다.</p>'; return; }
  $('creator-ranking').innerHTML = groups.map((group, index) => `<button type="button" class="creator-item" data-creator="${esc(group.creator)}" aria-label="${esc(group.creator)} 분석 보기"><span class="creator-rank">${String(index + 1).padStart(2, '0')}</span><span class="avatar" aria-hidden="true">${esc([...group.creator][0])}</span><span class="creator-copy"><span class="creator-name">${esc(group.creator)}</span><span class="creator-stats"><strong>${esc(shortNumber(group[state.metric]))}</strong> ${state.metric === 'count' ? '개 영상' : `· 영상 ${formatNumber(group.count)}개`}</span></span></button>`).join('');
}

function sortedVideos() {
  const sort = $('sort').value;
  const rate = (video) => validMetric(video.likes) && validMetric(video.views) && video.views > 0 ? video.likes / video.views : -1;
  return [...state.filtered].sort((a, b) => {
    if (sort === 'date') return String(b.date ?? '').localeCompare(String(a.date ?? '')) || (b.views ?? -1) - (a.views ?? -1);
    if (sort === 'rate') return rate(b) - rate(a) || (b.views ?? -1) - (a.views ?? -1);
    return (b[sort] ?? -1) - (a[sort] ?? -1) || String(b.date ?? '').localeCompare(String(a.date ?? ''));
  });
}

function renderTable() {
  const sorted = sortedVideos();
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  state.page = Math.max(1, Math.min(state.page, totalPages));
  const offset = (state.page - 1) * PAGE_SIZE;
  const rows = sorted.slice(offset, offset + PAGE_SIZE);
  $('video-count').textContent = formatNumber(sorted.length);
  $('video-rows').innerHTML = rows.map((video, index) => {
    const url = safeUrl(video.url);
    const rate = validMetric(video.likes) && validMetric(video.views) && video.views > 0 ? `${(video.likes / video.views * 100).toLocaleString('ko-KR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%` : '—';
    const title = url ? `<a class="video-title" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(video.title)} · 새 창에서 영상 보기">${esc(video.title || '제목 미확인')}</a>` : `<span class="video-title">${esc(video.title || '제목 미확인')}</span>`;
    return `<tr><td class="row-rank">${offset + index + 1}</td><td class="video-main">${title}<div class="video-sub"><span class="format-tag">${esc(video.format || '미확인')}</span>${url ? '<span>영상 열기 ↗</span>' : '<span>링크 미확인</span>'}</div></td><td class="creator-cell"><button type="button" data-creator="${esc(video.creator)}" title="${esc(video.creator)} 분석 보기">${esc(video.creator)}</button></td><td class="date-cell">${esc(formatDate(video.date))}</td><td class="topic-cell">${(video.topics || []).map((topic) => `<span class="topic-tag" title="${esc(topic)}">${esc(topic)}</span>`).join('')}<span class="version-tag">${video.version ? esc(video.version) : '버전 미지정'}</span></td><td class="numeric views-cell">${formatNumber(video.views)}</td><td class="numeric likes-cell">${formatNumber(video.likes)}</td><td class="numeric rate-cell">${rate}</td></tr>`;
  }).join('');
  $('empty-state').hidden = sorted.length > 0;
  $('page-summary').textContent = sorted.length ? `${formatNumber(sorted.length)}개 중 ${formatNumber(offset + 1)}–${formatNumber(Math.min(offset + PAGE_SIZE, sorted.length))}` : '0개 영상';
  $('page-label').textContent = `${state.page} / ${totalPages}`;
  $('prev-page').disabled = state.page <= 1;
  $('next-page').disabled = state.page >= totalPages;
  $('export').disabled = !sorted.length;
}

function render({ resetPage = true } = {}) {
  if (!state.payload) return;
  const selected = filters();
  const validity = validateDateRange(selected.start, selected.end);
  $('date-error').hidden = validity.valid;
  $('date-error').textContent = validity.error || '';
  $('start-date').setAttribute('aria-invalid', String(!validity.valid));
  $('end-date').setAttribute('aria-invalid', String(!validity.valid));
  state.filtered = filterVideos(state.payload.videos, selected);
  if (resetPage) state.page = 1;
  const summary = [selected.creator || '전체 KOC', selected.topic || '전체 주제'];
  if (selected.version) summary.push(`버전 ${selected.version}`);
  if (selected.format) summary.push(selected.format);
  if (selected.start || selected.end) summary.push(`${selected.start ? formatDate(selected.start) : '처음'} — ${selected.end ? formatDate(selected.end) : '현재'}`);
  else summary.push('전체 기간');
  $('filter-description').textContent = summary.join(' · ');
  renderMetrics(state.filtered);
  renderTrend(state.filtered);
  renderTopics(state.filtered);
  renderCreators(state.filtered);
  renderTable();
}

function resetFilters() {
  for (const id of ['creator-search', 'creator-filter', 'topic-filter', 'format-filter', 'version-filter', 'query']) $(id).value = '';
  populateCreators();
  setPeriod('all');
}

function selectCreator(creator) {
  $('creator-search').value = '';
  populateCreators();
  $('creator-filter').value = creator;
  render();
  $('filters-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function validatePayload(payload) {
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const invalid = (message) => { throw new Error(`데이터 형식 오류: ${message}`); };
  if (!object(payload) || payload.schemaVersion !== 1 || !['preview', 'live'].includes(payload.mode) || !Array.isArray(payload.videos)) invalid('지원하는 데이터 파일이 아닙니다.');
  if (!object(payload.source)) invalid('데이터 출처가 없습니다.');
  for (const field of ['url', 'label', 'sheetId', 'status', 'reader']) if (payload.source[field] !== undefined && typeof payload.source[field] !== 'string') invalid(`출처 ${field} 값이 올바르지 않습니다.`);
  if (payload.source.revision !== undefined && payload.source.revision !== null && typeof payload.source.revision !== 'string' && !validMetric(payload.source.revision)) invalid('원본 리비전이 올바르지 않습니다.');
  if (payload.source.provenance !== undefined) {
    if (!object(payload.source.provenance)) invalid('미리보기 출처가 올바르지 않습니다.');
    for (const field of ['url', 'label', 'generatedAt']) if (payload.source.provenance[field] !== undefined && payload.source.provenance[field] !== null && typeof payload.source.provenance[field] !== 'string') invalid(`미리보기 출처 ${field} 값이 올바르지 않습니다.`);
  }
  for (const field of ['generatedAt', 'importedAt', 'syncedAt']) {
    const value = payload[field];
    if (value !== undefined && value !== null && (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) invalid(`${field} 시점이 올바르지 않습니다.`);
  }
  if (payload.metricUpdatedAt !== undefined && payload.metricUpdatedAt !== null) {
    if (typeof payload.metricUpdatedAt !== 'string') invalid('원본 지표 갱신 시각이 올바르지 않습니다.');
    const value = payload.metricUpdatedAt;
    const local = value.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/);
    if (local) {
      if (!validateDateRange(local[1], local[1]).valid || Number(local[2] || 0) > 23 || Number(local[3] || 0) > 59 || Number(local[4] || 0) > 59) invalid('원본 지표 갱신 시각이 올바르지 않습니다.');
    } else if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) || !Number.isFinite(Date.parse(value))) invalid('원본 지표 갱신 시각이 올바르지 않습니다.');
  }
  if (payload.sync !== undefined) {
    if (!object(payload.sync)) invalid('자동 동기화 설정이 올바르지 않습니다.');
    for (const field of ['enabled', 'requiresComputer']) if (payload.sync[field] !== undefined && typeof payload.sync[field] !== 'boolean') invalid(`자동 동기화 ${field} 값이 올바르지 않습니다.`);
    if (payload.sync.method !== undefined && typeof payload.sync.method !== 'string') invalid('자동 동기화 방식이 올바르지 않습니다.');
    if (payload.sync.intervalHours !== undefined && (!validMetric(payload.sync.intervalHours) || payload.sync.intervalHours <= 0)) invalid('자동 동기화 간격이 올바르지 않습니다.');
  }
  if (payload.coverage !== undefined) {
    if (!object(payload.coverage)) invalid('수집 범위가 올바르지 않습니다.');
    const { start = '', end = '' } = payload.coverage;
    if (typeof start !== 'string' || typeof end !== 'string' || !validateDateRange(start, end).valid) invalid('수집 범위 날짜가 올바르지 않습니다.');
  }
  if (payload.warnings !== undefined && (!Array.isArray(payload.warnings) || payload.warnings.some((warning) => typeof warning !== 'string'))) invalid('안내 문구가 올바르지 않습니다.');
  if (payload.versions !== undefined) {
    if (!Array.isArray(payload.versions)) invalid('버전 목록이 올바르지 않습니다.');
    payload.versions.forEach((version) => {
      if (!object(version) || typeof version.id !== 'string' || !version.id || (version.label !== undefined && typeof version.label !== 'string')) invalid('버전 정보가 올바르지 않습니다.');
      const start = version.start ?? '', end = version.end ?? '';
      if (typeof start !== 'string' || typeof end !== 'string' || !validateDateRange(start, end).valid) invalid('버전 기간이 올바르지 않습니다.');
    });
  }
  payload.videos.forEach((video, index) => {
    if (!object(video)) invalid(`${index + 1}번째 영상이 올바르지 않습니다.`);
    for (const field of ['id', 'creator', 'title', 'date']) if (typeof video[field] !== 'string' || !video[field].trim()) invalid(`${index + 1}번째 영상의 ${field} 값이 올바르지 않습니다.`);
    if (!validateDateRange(video.date, video.date).valid) invalid(`${index + 1}번째 영상의 업로드일이 올바르지 않습니다.`);
    if (!Array.isArray(video.topics) || video.topics.some((topic) => typeof topic !== 'string')) invalid(`${index + 1}번째 영상의 주제가 올바르지 않습니다.`);
    if (video.version !== null && typeof video.version !== 'string') invalid(`${index + 1}번째 영상의 버전이 올바르지 않습니다.`);
    for (const field of ['views', 'likes']) if (video[field] !== null && !validMetric(video[field])) invalid(`${index + 1}번째 영상의 ${field} 지표가 올바르지 않습니다.`);
    for (const field of ['format', 'url']) if (video[field] !== undefined && video[field] !== null && typeof video[field] !== 'string') invalid(`${index + 1}번째 영상의 ${field} 값이 올바르지 않습니다.`);
  });
  return { ...payload, versions: payload.versions || [], warnings: payload.warnings || [], videos: payload.videos.map((video) => ({ ...video, topics: video.topics.length ? video.topics : ['미분류'] })) };
}

async function loadData({ automatic = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  $('refresh').disabled = true;
  $('refresh').classList.add('busy');
  $('refresh').setAttribute('aria-busy', 'true');
  const previous = { payload: state.payload, filtered: state.filtered, page: state.page, period: state.period, filters: filters() };
  let applied = false;
  try {
    const response = await fetch(new URL('../data/koc-data.json', import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = validatePayload(await response.json());
    state.payload = payload;
    applied = true;
    if (['week', 'month', 'year'].includes(state.period)) {
      const range = getPeriodRange(state.period, getToday('Asia/Seoul'));
      $('start-date').value = range.start;
      $('end-date').value = range.end;
    }
    populateFilters();
    renderSource();
    render({ resetPage: !automatic });
    $('load-error').hidden = true;
    $('checked-at').textContent = `화면 확인 ${timeLabel(new Date().toISOString())} KST · 5분마다 새 파일 확인`;
  } catch (error) {
    if (applied) {
      state.payload = previous.payload;
      state.filtered = previous.filtered;
      state.page = previous.page;
      state.period = previous.period;
      if (previous.payload) {
        try {
          populateFilters();
          for (const [field, id] of Object.entries({ start: 'start-date', end: 'end-date', creator: 'creator-filter', topic: 'topic-filter', version: 'version-filter', format: 'format-filter', query: 'query' })) $(id).value = previous.filters[field];
          renderSource();
          render({ resetPage: false });
        } catch { /* Keep the last valid payload available for the next refresh. */ }
      }
    }
    $('load-error').hidden = false;
    $('load-error').textContent = state.payload
      ? `새 데이터 파일을 확인하지 못했습니다. 마지막으로 불러온 데이터를 유지합니다. 잠시 후 ‘데이터 새로고침’을 눌러 주세요. (${error.message})`
      : `데이터를 불러오지 못했습니다. 서버 연결을 확인한 뒤 ‘데이터 새로고침’을 눌러 주세요. (${error.message})`;
    if (!state.payload) {
      $('status-pill').innerHTML = '<i></i>데이터 로딩 실패';
      $('status-pill').classList.remove('live');
      $('source-notice').classList.remove('live');
      $('source-metadata').hidden = true;
      $('source-freshness').hidden = true;
      $('synced-at').hidden = true;
      $('source-notice-title').textContent = '데이터 파일을 확인할 수 없습니다.';
      $('source-notice-body').textContent = '연결이 복구되면 데이터를 다시 불러올 수 있습니다.';
      $('trend-chart').innerHTML = '<p class="chart-empty">데이터 연결을 기다리고 있습니다.</p>';
      $('topic-chart').innerHTML = '<p class="chart-empty">데이터 연결을 기다리고 있습니다.</p>';
      $('creator-ranking').innerHTML = '<p class="chart-empty">데이터 연결을 기다리고 있습니다.</p>';
      for (const id of ['metric-videos', 'metric-views', 'metric-likes', 'metric-rate', 'metric-creators']) $(id).textContent = '—';
      $('video-rows').replaceChildren();
      $('video-count').textContent = '0';
      $('export').disabled = true;
      $('collected-at').textContent = '데이터 수집 시점 미확인';
    }
  } finally {
    state.loading = false;
    $('refresh').disabled = false;
    $('refresh').classList.remove('busy');
    $('refresh').setAttribute('aria-busy', 'false');
  }
}

document.querySelectorAll('[data-period]').forEach((button) => button.addEventListener('click', () => setPeriod(button.dataset.period)));
document.querySelectorAll('[data-metric]').forEach((button) => button.addEventListener('click', () => {
  state.metric = button.dataset.metric;
  document.querySelectorAll('[data-metric]').forEach((other) => {
    const selected = other === button;
    other.classList.toggle('selected', selected);
    other.setAttribute('aria-pressed', String(selected));
  });
  render({ resetPage: false });
}));
for (const id of ['start-date', 'end-date']) $(id).addEventListener('change', () => {
  state.period = 'custom';
  document.querySelectorAll('[data-period]').forEach((button) => {
    button.classList.toggle('selected', button.dataset.period === 'custom');
    button.setAttribute('aria-pressed', String(button.dataset.period === 'custom'));
  });
  render();
});
for (const id of ['creator-filter', 'topic-filter', 'format-filter', 'version-filter']) $(id).addEventListener('change', () => render());
$('creator-search').addEventListener('input', populateCreators);
$('creator-search').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const options = [...$('creator-filter').options].filter((option) => option.value);
    if (options.length === 1) { $('creator-filter').value = options[0].value; render(); }
  }
});
$('query').addEventListener('input', () => render());
$('sort').addEventListener('change', () => { state.page = 1; renderTable(); });
$('reset-filters').addEventListener('click', resetFilters);
$('empty-reset').addEventListener('click', resetFilters);
$('refresh').addEventListener('click', () => loadData());
$('prev-page').addEventListener('click', () => { state.page -= 1; renderTable(); });
$('next-page').addEventListener('click', () => { state.page += 1; renderTable(); });
$('creator-ranking').addEventListener('click', (event) => { const button = event.target.closest('[data-creator]'); if (button) selectCreator(button.dataset.creator); });
$('video-rows').addEventListener('click', (event) => { const button = event.target.closest('[data-creator]'); if (button) selectCreator(button.dataset.creator); });
$('topic-chart').addEventListener('click', (event) => {
  const button = event.target.closest('[data-topic]');
  if (button) { $('topic-filter').value = button.dataset.topic; render(); }
});
$('export').addEventListener('click', () => {
  if (!state.filtered.length) return;
  const blob = new Blob([toCsv(sortedVideos())], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `명조-KOC-${state.payload.mode === 'preview' ? '미리보기-' : ''}${getToday('Asia/Seoul')}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
});

loadData();
setInterval(() => { if (!document.hidden) loadData({ automatic: true }); }, 5 * 60 * 1000);
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => { if (state.payload) renderTrend(state.filtered); }).observe($('trend-chart'));
}
