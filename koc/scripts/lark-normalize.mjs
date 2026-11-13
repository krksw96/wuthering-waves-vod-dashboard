import { createHash } from 'node:crypto';

const aliases = {
  creator: ['KOC명', 'KOC 이름', 'KOC', '크리에이터', '크리에이터명', '유튜버 이름', '유튜버', '채널명', 'creator', 'creator name', 'channel', 'channel name', '博主', '博主名称', '达人', '达人名称', '创作者', '创作者名称'],
  title: ['영상 제목', '영상명', '제목', '콘텐츠 제목', 'title', 'video title', '视频标题', '视频名称', '标题', '作品标题'],
  url: ['영상 링크', '콘텐츠 링크', '영상 URL', '유튜브 링크', '링크', 'url', 'link', 'video url', 'video link', '视频链接', '作品链接', '链接'],
  date: ['업로드일', '업로드 날짜', '업로드 일자', '게시일', '게시 날짜', '게시일자', '발행일', '날짜', 'date', 'published at', 'published date', 'publish date', 'upload date', '发布时间', '发布日期', '发布日', '投稿日期', '上传日期', '日期'],
  views: ['조회수', '조회 수', '누적 조회수', 'views', 'view count', 'viewcount', '播放量', '播放数', '观看次数', '观看数', '浏览量'],
  likes: ['좋아요', '좋아요수', '좋아요 수', 'likes', 'like count', 'likecount', '点赞', '点赞数', '点赞量'],
  topics: ['콘텐츠 주제', '컨텐츠 주제', '주제', '카테고리', '콘텐츠 분류', '콘텐츠 유형', 'topic', 'topics', 'content topic', 'category', '内容主题', '主题', '内容分类', '内容类型', '分类', '标签'],
  version: ['게임 버전', '버전', 'version', 'game version', '版本', '游戏版本', '版本号'],
  format: ['영상 형식', '영상 유형', '형식', 'format', 'video format', '视频形式', '视频类型', '形式'],
};

const normalizedHeader = (value) => textOf(value).normalize('NFKC').toLowerCase().replace(/[\s_\-()[\]{}:：.]/g, '');
const aliasSets = Object.fromEntries(Object.entries(aliases).map(([key, values]) => [key, new Set(values.map(normalizedHeader))]));
const isoPattern = /^\d{4}-\d{2}-\d{2}$/;

function plainText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(plainText).join('');
  if (typeof value === 'object') {
    if (value.text != null) return plainText(value.text);
    if (value.content != null) return plainText(value.content);
    if (value.value != null) return plainText(value.value);
    if (value.rich_text != null) return plainText(value.rich_text);
    if (value.name != null) return plainText(value.name);
  }
  return '';
}

export function textOf(value) { return plainText(value).trim(); }

export function safeSourceUrl(value) {
  try {
    const url = new URL(String(value).trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}

export function linkOf(value) {
  if (Array.isArray(value)) return value.map(linkOf).find(Boolean) || '';
  if (value && typeof value === 'object') {
    for (const key of ['link', 'url', 'hyperlink']) {
      const candidate = value[key];
      const found = safeSourceUrl(typeof candidate === 'object' ? candidate?.url || candidate?.link || '' : candidate || '');
      if (found) return found;
    }
    for (const key of ['rich_text', 'text', 'value', 'content']) {
      const found = linkOf(value[key]);
      if (found) return found;
    }
    return '';
  }
  const text = textOf(value);
  const direct = safeSourceUrl(text);
  if (direct) return direct;
  const formula = text.match(/^=HYPERLINK\(\s*"(https?:\/\/[^"\s]+)"\s*[,;]/i);
  return formula ? safeSourceUrl(formula[1]) : '';
}

export function parseMetric(value) {
  if (value == null || textOf(value) === '') return null;
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
  const text = textOf(value).normalize('NFKC').trim();
  if (/^(?:-|—|–|n\/?a|null|none|비공개|미공개|없음|隐藏|未公开|暂无)$/i.test(text)) return null;
  const match = text.match(/^(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k|m|b|천|만|억|千|万|亿)?\s*(?:회|次)?$/i);
  if (!match) return null;
  const factors = { k: 1e3, m: 1e6, b: 1e9, 천: 1e3, 만: 1e4, 억: 1e8, 千: 1e3, 万: 1e4, 亿: 1e8 };
  const numeric = Number(match[1].replaceAll(',', '')) * (factors[match[2]?.toLowerCase()] || 1);
  const result = Math.round(numeric);
  if (!Number.isSafeInteger(result) || result < 0 || Math.abs(result - numeric) > 0.0001) return null;
  return result;
}

function validDate(year, month, day) {
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10) : null;
}

export function parseDate(value, { dateOrder = 'YMD', timeZone = 'Asia/Seoul' } = {}) {
  if (value == null || textOf(value) === '') return null;
  const text = textOf(value).normalize('NFKC');
  if (typeof value === 'number' || /^\d{5}(?:\.\d+)?$/.test(text)) {
    const serial = Number(text);
    // Lark/Excel serial dates use 1899-12-30. Reject the Excel-only fake leap day.
    if (serial < 61 || serial > 109574) return null;
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000).toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    const prefix = text.slice(0, 10).split('-').map(Number);
    if (!validDate(...prefix)) return null;
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) return validDate(...prefix);
    const stamp = new Date(text);
    if (!Number.isFinite(stamp.getTime())) return null;
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(stamp).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  const ymd = text.match(/^(\d{4})\s*[-./년年]\s*(\d{1,2})\s*[-./월月]\s*(\d{1,2})(?:\s*[일日.]?)?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if (ymd) return validDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
  if (['DMY', 'MDY'].includes(dateOrder)) {
    const other = text.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
    if (other) return validDate(Number(other[3]), Number(other[dateOrder === 'MDY' ? 1 : 2]), Number(other[dateOrder === 'MDY' ? 2 : 1]));
  }
  return null;
}

export function parseCsv(csv) {
  const input = String(csv).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false, afterQuote = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') { quoted = false; afterQuote = true; }
      else field += char;
    } else if (char === '"' && field === '' && !afterQuote) quoted = true;
    else if (char === ',') { row.push(field); field = ''; afterQuote = false; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = ''; afterQuote = false;
    } else {
      if (afterQuote && !/\s/.test(char)) throw new Error('CSV의 닫는 따옴표 뒤에 잘못된 문자가 있습니다.');
      if (!afterQuote) field += char;
    }
  }
  if (quoted) throw new Error('CSV 따옴표가 닫히지 않았습니다.');
  if (row.length || field || afterQuote) { row.push(field); rows.push(row); }
  return rows;
}

export function extractRows(input) {
  if (Array.isArray(input)) {
    if (input.every(Array.isArray)) return input;
    throw new Error('JSON은 셀의 2차원 배열이어야 합니다.');
  }
  const values = input?.values || input?.data?.valueRange?.values || input?.valueRange?.values || input?.data?.values;
  if (Array.isArray(values)) return extractRows(values);
  const sheets = input?.data?.sheets || input?.sheets;
  if (Array.isArray(sheets) && sheets.length > 1) throw new Error('JSON에 여러 시트가 있습니다. 대상 KOC 시트 하나만 내보내세요.');
  const sheet = sheets?.[0];
  if (Array.isArray(sheet?.columns) && Array.isArray(sheet?.data)) {
    const startRow = String(sheet.range || '').match(/(?:^|!)[A-Z]+(\d+):[A-Z]+\d+$/i)?.[1];
    if (startRow && Number(startRow) > 100000) throw new Error('가져오기 파일의 시작 행이 허용 범위를 벗어납니다.');
    return [...Array.from({ length: startRow ? Number(startRow) - 1 : 0 }, () => []), sheet.columns, ...sheet.data];
  }
  throw new Error('지원하지 않는 JSON 형식입니다. values 배열 또는 lark-cli +table-get 결과를 사용하세요.');
}

export function columnIndex(value, headers = []) {
  if (Number.isInteger(value) && value >= 0) return value;
  if (typeof value === 'string') {
    const indices = headers.map((header, index) => normalizedHeader(header) === normalizedHeader(value) ? index : -1).filter((index) => index >= 0);
    if (indices.length === 1) return indices[0];
    if (indices.length > 1) throw new Error('columnMap에 지정한 헤더 이름이 중복됩니다. 열 문자나 번호를 사용하세요.');
    if (/^[A-Z]{1,3}$/.test(value)) return [...value].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  }
  throw new Error('columnMap은 0부터 시작하는 열 번호, 대문자 열 문자 또는 유일한 헤더 이름이어야 합니다.');
}

function identifyColumns(headers, explicit = {}, { strict = false } = {}) {
  const columns = {};
  const ambiguous = [];
  for (const field of Object.keys(aliases)) {
    if (explicit[field] != null) { columns[field] = columnIndex(explicit[field], headers); continue; }
    const indices = headers.map((header, index) => aliasSets[field].has(normalizedHeader(header)) ? index : -1).filter((index) => index >= 0);
    if (indices.length > 1) ambiguous.push(field);
    if (indices.length) columns[field] = indices[0];
  }
  if (strict && ambiguous.length) throw new Error(`같은 의미의 열이 여러 개입니다 (${ambiguous.join(', ')}). config/source.json의 columnMap으로 정확히 지정하세요.`);
  return columns;
}

export function findHeader(rows, config = {}) {
  let index;
  if (config.headerRow != null) {
    if (!Number.isInteger(config.headerRow) || config.headerRow < 1 || config.headerRow > rows.length) throw new Error('headerRow는 존재하는 행의 1부터 시작하는 번호여야 합니다.');
    index = config.headerRow - 1;
  } else {
    const candidates = rows.slice(0, 30).map((row, i) => {
      const columns = identifyColumns(row, config.columnMap);
      const valid = columns.creator != null && columns.date != null && (columns.url != null || columns.title != null);
      return { index: i, score: valid ? Object.keys(columns).length : -1 };
    }).sort((a, b) => b.score - a.score || a.index - b.index);
    if (!candidates.length || candidates[0].score < 0) throw new Error('KOC·게시일·영상 링크/제목 헤더를 찾지 못했습니다. headerRow와 columnMap을 설정하세요.');
    index = candidates[0].index;
  }
  const columns = identifyColumns(rows[index], config.columnMap, { strict: true });
  if (columns.creator == null || columns.date == null || (columns.url == null && columns.title == null)) throw new Error('필수 열이 없습니다: creator, date, url 또는 title.');
  const mapped = Object.values(columns);
  if (new Set(mapped).size !== mapped.length) throw new Error('columnMap에 같은 열을 중복 지정할 수 없습니다.');
  return { index, columns };
}

function youtubeId(url) {
  if (!url) return '';
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  let id = '';
  if (host === 'youtu.be') id = parsed.pathname.slice(1).split('/')[0];
  else if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) id = parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1] || '';
  return /^[\w-]{11}$/.test(id) ? id : '';
}

export function normalizeRows(rows, config = {}, { generatedAt = new Date().toISOString(), imported = false } = {}) {
  if (!Array.isArray(rows) || !rows.every(Array.isArray)) throw new Error('입력은 2차원 셀 배열이어야 합니다.');
  if (!Number.isFinite(new Date(generatedAt).getTime())) throw new Error('generatedAt가 유효한 날짜가 아닙니다.');
  const { index: headerIndex, columns } = findHeader(rows, config);
  const warnings = [];
  const counts = { blankRows: 0, repeatedHeaders: 0, invalidRows: 0, duplicateRows: 0, invalidViews: 0, invalidLikes: 0, missingUrls: 0 };
  const byId = new Map();
  const versionRanges = (config.versions || []).map((version) => {
    if (!version.id || !isoPattern.test(version.start || '') || !isoPattern.test(version.end || '') || !parseDate(version.start) || !parseDate(version.end) || version.start > version.end) throw new Error('설정 버전은 id와 정확한 start/end 날짜가 필요합니다.');
    return { id: String(version.id), label: String(version.label || version.id), start: version.start, end: version.end };
  });
  for (let i = 0; i < versionRanges.length; i += 1) {
    if (versionRanges.some((other, j) => i !== j && other.start <= versionRanges[i].end && other.end >= versionRanges[i].start)) throw new Error('설정 버전 날짜 범위가 겹칩니다.');
  }
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row.some((value) => textOf(value) || linkOf(value))) { counts.blankRows += 1; continue; }
    if (normalizedHeader(row[columns.creator]) === normalizedHeader(rows[headerIndex][columns.creator]) && normalizedHeader(row[columns.date]) === normalizedHeader(rows[headerIndex][columns.date])) { counts.repeatedHeaders += 1; continue; }
    const creator = textOf(row[columns.creator]);
    const date = parseDate(row[columns.date], config);
    const url = linkOf(row[columns.url]);
    const title = textOf(row[columns.title]);
    if (!creator || !date || (!url && !title) || /^(합계|소계|총계|총합|合计|总计|total|subtotal)$/i.test(creator)) { counts.invalidRows += 1; continue; }
    const views = parseMetric(row[columns.views]);
    const likes = parseMetric(row[columns.likes]);
    if (columns.views != null && textOf(row[columns.views]) && views == null) counts.invalidViews += 1;
    if (columns.likes != null && textOf(row[columns.likes]) && likes == null) counts.invalidLikes += 1;
    if (!url) counts.missingUrls += 1;
    const topics = [...new Set(textOf(row[columns.topics]).split(/[,，;；\n|、]+/).map((value) => value.trim()).filter(Boolean))];
    const sourceVersion = textOf(row[columns.version]);
    const matchedVersion = versionRanges.find((version) => date >= version.start && date <= version.end);
    const version = sourceVersion || matchedVersion?.id || null;
    const rawFormat = textOf(row[columns.format]);
    const format = /^(shorts?|쇼츠|短视频|短片)$/i.test(rawFormat) || url.includes('/shorts/') ? 'Shorts' : /^(vod|video|일반|일반 영상|长视频|长片)$/i.test(rawFormat) ? 'VOD' : rawFormat || '미지정';
    const ytId = youtubeId(url);
    const canonicalUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : url;
    const identity = ytId || (url ? `url:${url}` : `row:${i + 1}\u0000${creator}\u0000${date}\u0000${title}`);
    const id = ytId || createHash('sha256').update(identity).digest('hex').slice(0, 24);
    const video = { id, creator, title: title || '제목 미입력', url: canonicalUrl, date, views, likes, topics: topics.length ? topics : ['미분류'], version, format, sourceRow: i + 1 };
    if (byId.has(id)) counts.duplicateRows += 1;
    // A duplicate link is one video. The last source row wins as a complete record.
    // Never combine a new low count with an old higher count, which could invent a snapshot.
    byId.set(id, video);
  }
  const videos = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date) || a.sourceRow - b.sourceRow);
  if (!videos.length) throw new Error('유효한 영상이 없습니다. 기존 데이터는 보존합니다. 헤더·날짜·권한을 확인하세요.');
  const maxInvalidRatio = config.maxInvalidRowRatio ?? 0.1;
  if (typeof maxInvalidRatio !== 'number' || maxInvalidRatio < 0 || maxInvalidRatio > 1) throw new Error('maxInvalidRowRatio는 0~1 사이 숫자여야 합니다.');
  const candidateCount = videos.length + counts.duplicateRows + counts.invalidRows;
  if (counts.invalidRows / candidateCount > maxInvalidRatio) throw new Error(`유효하지 않은 행이 ${counts.invalidRows}/${candidateCount}개입니다. 부분 데이터로 덮어쓰지 않았습니다. 원본 형식 확인 후 maxInvalidRowRatio를 조정하세요.`);
  if (counts.invalidRows) warnings.push(`KOC·게시일·제목/링크가 없거나 날짜가 잘못된 ${counts.invalidRows}개 행 제외`);
  if (counts.duplicateRows) warnings.push(`중복 영상 ${counts.duplicateRows}개 행: 마지막 원본 행 사용`);
  if (counts.invalidViews) warnings.push(`조회수 미공개/해석 불가 ${counts.invalidViews}개 행은 빈 값으로 유지`);
  if (counts.invalidLikes) warnings.push(`좋아요 미공개/해석 불가 ${counts.invalidLikes}개 행은 빈 값으로 유지`);
  if (counts.missingUrls) warnings.push(`영상 링크가 없거나 유효하지 않은 ${counts.missingUrls}개 영상`);
  if (columns.views == null) warnings.push('원본에서 조회수 열을 찾지 못했습니다.');
  if (columns.likes == null) warnings.push('원본에서 좋아요 열을 찾지 못했습니다.');
  if (columns.topics == null) warnings.push('원본에 주제 열이 없어 미분류로 표시합니다.');
  if (columns.version == null && !versionRanges.length) warnings.push('원본 버전 정보가 없어 버전을 추정하지 않았습니다.');
  const availableVersions = [...new Set(videos.map((video) => video.version).filter(Boolean))];
  const versions = availableVersions.map((id) => versionRanges.find((version) => version.id === id) || { id, label: id }).sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  const dates = videos.map((video) => video.date).sort();
  return {
    schemaVersion: 1,
    mode: 'live',
    source: { url: safeSourceUrl(config.url), sheetId: String(config.sheetId || ''), label: String(config.label || 'Lark KOC 원본'), status: imported ? 'imported' : 'connected' },
    generatedAt,
    ...(imported ? { importedAt: generatedAt } : { syncedAt: generatedAt }),
    coverage: { start: dates[0], end: dates.at(-1) },
    videos,
    versions,
    warnings,
    quality: { sourceRows: rows.length, headerRow: headerIndex + 1, ...counts, videoCount: videos.length },
  };
}
