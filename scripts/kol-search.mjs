import { LIVE_DASHBOARD_URL, createKolDirectory, normalizeName, parseLiveSource, searchKols, summarizeKol, validateDateRange } from "./kol-search-model.mjs";

const messages = {
  ko: {
    liveDestination: "명조 라이브 데이터", liveDestinationDescription: "방송 시간과 시청 지표를 라이브 대시보드에서 살펴보세요.",
    lookupTitle: "KOL 기간별 데이터 조회", lookupDescription: "이름 하나로, VOD와 라이브를 함께.", nameLabel: "KOL 이름", namePlaceholder: "KOL 이름을 입력하세요", gameLabel: "게임",
    gameWave: "명조", gameNte: "이환", gameZzz: "젠레스 존 제로", startDate: "시작일", endDate: "종료일", searchButton: "데이터 조회", presetsLabel: "조회 기간 바로 선택", recentDays: "최근 30일", lastMonth: "지난달", allPeriod: "전체 수집 기간",
    methodNote: "VOD는 업로드일, 라이브는 방송일 기준입니다. 라이브 지표는 명조에서 제공됩니다.", retry: "다시 불러오기", emptyTitle: "궁금한 KOL을 검색해 보세요", emptyDescription: "이름과 기간을 입력하면 해당 KOL의 영상·방송 지표가 이곳에 표시됩니다.",
    loading: "VOD·라이브 데이터를 확인하고 있습니다…", loadingPeriod: "수집 기간을 확인하고 있습니다…", enterName: "조회할 KOL 이름을 입력해 주세요.", invalidDate: "올바른 시작일과 종료일을 입력해 주세요.", reversedDate: "종료일은 시작일과 같거나 이후여야 합니다.", noMatches: "일치하는 KOL 이름이 없습니다. 다른 이름이나 채널명으로 검색해 주세요.", selectMatch: "검색 결과 {count}명 · 확인할 KOL을 선택하세요.", moreMatches: "검색 결과가 많습니다. 이름을 더 입력하면 범위를 좁힐 수 있습니다.", resultStatus: "{name} · 선택 기간의 조회 결과입니다.", changed: "검색 조건을 변경했습니다. 데이터 조회를 눌러 확인하세요.",
    allFailed: "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", partialFailed: "{source} 데이터를 불러오지 못했습니다. 확인 가능한 결과를 먼저 표시합니다.",
    uploads: "업로드 영상", views: "누적 조회수", likes: "좋아요", comments: "댓글", formatCount: "VOD {vod} · Shorts {shorts}", knownMetrics: "{total}개 중 {known}개 공개 수치", streams: "방송 횟수", playHours: "총 방송 시간 (시간)", average: "평균 시청자", peak: "최고 동시 시청자", viewerHours: "누적 시청 시간 (시청자·시간)",
    vodNote: "선택 기간에 업로드된 영상의 최신 누적 수치입니다. 해당 기간에 발생한 조회수 증분은 아닙니다.", liveNote: "평균 시청자는 방송 시간으로 가중합니다. 누적 시청 시간은 시청자 수 × 시간이며, 고유 시청자 수가 아닙니다.",
    coverage: "수집 기간 {start} ~ {end}", updated: "최근 수집 {date}", partialCoverage: "선택 기간 중 수집된 날짜만 집계했습니다.", outsideCoverage: "선택한 기간은 수집 범위 밖입니다.", sourceUnavailable: "이 데이터 소스를 현재 확인할 수 없습니다.", liveUnsupported: "이 게임의 라이브 데이터는 아직 연결되지 않았습니다. 명조를 선택하면 라이브도 함께 조회할 수 있습니다.", noVodIdentity: "이 이름에 연결된 VOD 채널이 수집 데이터에 없습니다.", noLiveIdentity: "이 이름으로 수집된 라이브 기록이 없습니다.", noActivity: "선택한 기간에 수집된 활동이 없습니다.", matchedNames: "연결된 이름: {names}", sourceLink: "{source} 대시보드 열기 ↗", nameMatching: "수집된 채널명과 등록된 별칭으로 연결합니다.",
  },
  zh: {
    liveDestination: "鸣潮直播数据", liveDestinationDescription: "打开直播看板，查看直播时长与观看指标。", lookupTitle: "按时间查询 KOL 数据", lookupDescription: "一个名字，同时查看视频与直播。", nameLabel: "KOL 名称", namePlaceholder: "输入 KOL 名称", gameLabel: "游戏", gameWave: "鸣潮", gameNte: "异环", gameZzz: "绝区零", startDate: "开始日期", endDate: "结束日期", searchButton: "查询数据", presetsLabel: "快速选择时间", recentDays: "近 30 天", lastMonth: "上个月", allPeriod: "全部收录时间", methodNote: "视频按发布日期、直播按开播日期筛选。目前仅鸣潮提供直播数据。", retry: "重新加载", emptyTitle: "搜索你想了解的 KOL", emptyDescription: "输入名称和时间，查看该 KOL 的视频与直播指标。",
    loading: "正在读取视频与直播数据…", loadingPeriod: "正在读取收录时间…", enterName: "请输入 KOL 名称。", invalidDate: "请输入有效的开始和结束日期。", reversedDate: "结束日期不能早于开始日期。", noMatches: "没有匹配的 KOL。请尝试其他名称或频道名。", selectMatch: "找到 {count} 位 KOL，请选择要查看的名称。", moreMatches: "结果较多，请输入更完整的名称。", resultStatus: "{name} · 所选时间的查询结果。", changed: "条件已更改，请点击查询数据。", allFailed: "无法加载数据，请稍后重试。", partialFailed: "无法加载 {source} 数据，先显示可用结果。",
    uploads: "上传视频", views: "累计播放量", likes: "点赞", comments: "评论", formatCount: "VOD {vod} · Shorts {shorts}", knownMetrics: "{total} 个视频中 {known} 个已公开", streams: "直播次数", playHours: "直播总时长（小时）", average: "平均观众", peak: "最高同时在线观众", viewerHours: "累计观看时长（观众·小时）", vodNote: "显示所选时间发布的视频的最新累计指标，并非该时间内新增的播放量。", liveNote: "平均观众按直播时长加权。累计观看时长为观众数 × 小时，并非独立观众数。", coverage: "收录时间 {start} ~ {end}", updated: "最近采集 {date}", partialCoverage: "仅统计所选时间内已收录的日期。", outsideCoverage: "所选时间超出收录范围。", sourceUnavailable: "当前无法读取此数据源。", liveUnsupported: "此游戏尚未连接直播数据。选择鸣潮可同时查看直播指标。", noVodIdentity: "收录数据中没有此名称关联的视频频道。", noLiveIdentity: "没有收录此名称的直播记录。", noActivity: "所选时间内没有收录活动。", matchedNames: "关联名称：{names}", sourceLink: "打开 {source} 看板 ↗", nameMatching: "通过收录的频道名称与已登记别名关联。",
  },
  en: {
    liveDestination: "Wuthering Waves live data", liveDestinationDescription: "Explore broadcast hours and audience metrics in the live dashboard.", lookupTitle: "KOL data by date", lookupDescription: "One name. Video and live data together.", nameLabel: "KOL name", namePlaceholder: "Enter a KOL name", gameLabel: "Game", gameWave: "Wuthering Waves", gameNte: "NTE", gameZzz: "Zenless Zone Zero", startDate: "Start date", endDate: "End date", searchButton: "Search data", presetsLabel: "Date shortcuts", recentDays: "Last 30 days", lastMonth: "Last month", allPeriod: "Full coverage", methodNote: "Filter videos by upload date and streams by broadcast date. Live data is available for Wuthering Waves.", retry: "Reload data", emptyTitle: "Find the KOL you have in mind", emptyDescription: "Enter a name and date range to see their video and broadcast metrics.",
    loading: "Loading video and live data…", loadingPeriod: "Checking data coverage…", enterName: "Enter a KOL name to search.", invalidDate: "Enter a valid start and end date.", reversedDate: "The end date must be on or after the start date.", noMatches: "No KOL names match. Try another name or channel name.", selectMatch: "{count} matches · Choose a KOL to inspect.", moreMatches: "There are more matches. Enter a more specific name.", resultStatus: "{name} · Results for your selected dates.", changed: "Filters changed. Select Search data to update the results.", allFailed: "Data could not be loaded. Please try again.", partialFailed: "Could not load {source} data. Available results are shown below.",
    uploads: "Uploaded videos", views: "Cumulative views", likes: "Likes", comments: "Comments", formatCount: "VOD {vod} · Shorts {shorts}", knownMetrics: "Public for {known} of {total} videos", streams: "Broadcasts", playHours: "Broadcast hours", average: "Average viewers", peak: "Peak concurrent viewers", viewerHours: "Viewer-hours", vodNote: "Latest cumulative metrics for videos uploaded in this period, not the views gained during this period.", liveNote: "Average viewers are weighted by broadcast duration. Viewer-hours equal viewers × hours, not unique viewers.", coverage: "Coverage {start} – {end}", updated: "Last collected {date}", partialCoverage: "Only covered dates within your selection are included.", outsideCoverage: "Your selected dates are outside the available coverage.", sourceUnavailable: "This data source is currently unavailable.", liveUnsupported: "Live data is not connected for this game yet. Select Wuthering Waves to view both sources.", noVodIdentity: "No collected VOD channel is linked to this name.", noLiveIdentity: "No live records are collected under this name.", noActivity: "No activity was collected during this period.", matchedNames: "Linked names: {names}", sourceLink: "Open {source} dashboard ↗", nameMatching: "Names are linked using collected channel names and registered aliases.",
  },
};

const root = document.querySelector("#kol-lookup");
const form = document.querySelector("#kol-search-form");
const nameInput = document.querySelector("#kol-name");
const gameInput = document.querySelector("#kol-game");
const startInput = document.querySelector("#kol-start-date");
const endInput = document.querySelector("#kol-end-date");
const status = document.querySelector("#kol-status");
const empty = document.querySelector("#kol-empty");
const result = document.querySelector("#kol-result");
const matches = document.querySelector("#kol-matches");
const errorBox = document.querySelector("#kol-error");
const retry = document.querySelector("#kol-retry");
const cache = new Map();
let language = document.documentElement.lang.startsWith("zh") ? "zh" : document.documentElement.lang === "en" ? "en" : "ko";
let sequence = 0;
let current = null;
let statusMessage = null;
let errorMessage = null;
let lastAction = null;
const games = new Map([["wuthering-waves", "gameWave"], ["neverness-to-everness", "gameNte"], ["zenless-zone-zero", "gameZzz"]]);
const t = (key, values = {}) => (messages[language][key] || messages.ko[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
const number = (value, digits = 0) => value === null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat(language, { maximumFractionDigits: digits }).format(value);
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

function setStatus(key, values = {}) {
  statusMessage = key ? { key, values } : null;
  status.textContent = key ? t(key, values) : "";
}

function setError(key, values = {}) {
  errorMessage = key ? { key, values } : null;
  errorBox.hidden = !key;
  document.querySelector("#kol-error-message").textContent = key ? t(key, values) : "";
}

function busy(value) {
  root.dataset.busy = String(value);
  status.setAttribute("aria-busy", String(value));
  document.querySelector("#kol-submit").disabled = value;
  retry.disabled = value;
}

async function fetchData(key, url, parser) {
  const existing = cache.get(key);
  if (existing && Date.now() - existing.time < 300000) return existing.promise;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const promise = (async () => {
    try {
      const response = await fetch(url, { signal: controller.signal, cache: "no-cache", credentials: "omit" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return parser(await response.text());
    } catch (error) {
      cache.delete(key);
      throw error;
    } finally { clearTimeout(timer); }
  })();
  cache.set(key, { time: Date.now(), promise });
  return promise;
}

function readVod(text, game) {
  const data = JSON.parse(text);
  if (data?.version !== 1 || data.game !== game || !Array.isArray(data.creators) || !Array.isArray(data.aliases)) throw new Error("invalid-vod-index");
  validateDateRange(data.period?.start, data.period?.end);
  for (const creator of data.creators) {
    if (typeof creator?.name !== "string" || !Array.isArray(creator.days)) throw new Error("invalid-vod-creator");
    for (const row of creator.days) {
      if (!Array.isArray(row) || row.length !== 9 || row.slice(2).some((value) => !Number.isFinite(value) || value < 0)) throw new Error("invalid-vod-day");
      validateDateRange(row[0], row[0]);
    }
  }
  return data;
}

async function loadSources(game) {
  const [vod, live] = await Promise.allSettled([
    fetchData(`vod:${game}`, `data/kol-search-${game}.json`, (text) => readVod(text, game)),
    game === "wuthering-waves" ? fetchData("live", `${LIVE_DASHBOARD_URL}data/kol-data.js`, parseLiveSource) : Promise.resolve(null),
  ]);
  return { game, vodIndex: vod.status === "fulfilled" ? vod.value : null, liveData: live.status === "fulfilled" ? live.value : null,
    failed: [vod.status === "rejected" && "VOD", live.status === "rejected" && "LIVE"].filter(Boolean) };
}

function clearResults(changed = false) {
  sequence += 1;
  current = null;
  result.hidden = true;
  result.replaceChildren();
  matches.hidden = true;
  matches.replaceChildren();
  empty.hidden = false;
  setError(null);
  setStatus(changed && nameInput.value.trim() ? "changed" : null);
  startInput.removeAttribute("aria-invalid");
  endInput.removeAttribute("aria-invalid");
  busy(false);
}

function metric(label, value, detail, digits = 0) {
  const item = node("div", "kol-metric");
  item.append(node("dt", "", t(label)), node("dd", "", number(value, digits)));
  if (detail) item.append(node("small", "", detail));
  return item;
}

function sourceCard(kind, metrics, profile, sources) {
  const live = kind === "live";
  const title = live ? "LIVE" : "VOD & SHORTS";
  const card = node("article", `kol-source-card${live ? " is-live" : ""}`);
  card.setAttribute("aria-label", title);
  card.append(node("h4", "", title));
  const source = live ? sources.liveData : sources.vodIndex;
  const linkedNames = live ? profile.liveNames : profile.vodNames;
  let missing = null;
  if (live && sources.game !== "wuthering-waves") missing = "liveUnsupported";
  else if (metrics.coverage.status === "unavailable") missing = "sourceUnavailable";
  else if (metrics.coverage.status === "outside") missing = "outsideCoverage";
  else if (!linkedNames.length) missing = live ? "noLiveIdentity" : "noVodIdentity";
  if (missing) card.append(node("p", "kol-missing", t(missing)));
  else {
    const grid = node("dl", "kol-metric-grid");
    if (live) {
      grid.append(metric("streams", metrics.streams), metric("playHours", metrics.playHours, null, 1), metric("average", metrics.avgViewers), metric("peak", metrics.maxViewers), metric("viewerHours", metrics.viewershipTotal));
    } else {
      grid.append(metric("uploads", metrics.count, t("formatCount", { vod: number(metrics.vodCount), shorts: number(metrics.shortsCount) })));
      for (const key of ["views", "likes", "comments"]) {
        const detail = metrics.known[key] < metrics.count ? t("knownMetrics", { known: number(metrics.known[key]), total: number(metrics.count) }) : null;
        grid.append(metric(key, metrics[key], detail));
      }
    }
    card.append(grid);
    if ((live ? metrics.streams : metrics.count) === 0) card.append(node("p", "kol-source-note", t("noActivity")));
    card.append(node("p", "kol-source-note", t(live ? "liveNote" : "vodNote")));
    if (metrics.coverage.status === "partial") card.append(node("p", "kol-coverage", t("partialCoverage")));
    card.append(node("p", "kol-identity", t("matchedNames", { names: linkedNames.join(" · ") })));
  }
  if (source?.period) card.append(node("p", "kol-coverage", t("coverage", source.period)));
  if (source?.generatedAt) {
    const date = new Intl.DateTimeFormat(language, { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(source.generatedAt));
    card.append(node("p", "kol-updated", `${t("updated", { date })} KST`));
  }
  if (!live || sources.game === "wuthering-waves") {
    const link = node("a", "kol-source-link", t("sourceLink", { source: live ? "LIVE" : "VOD" }));
    link.href = live ? LIVE_DASHBOARD_URL : `dashboard.html?game=${encodeURIComponent(sources.game)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    card.append(link);
  }
  return card;
}

function renderResult() {
  if (!current?.profile) return;
  const { profile, sources, start, end } = current;
  const summary = summarizeKol(profile, { ...sources, start, end });
  const heading = node("div", "kol-result-heading");
  const identity = node("div", "kol-identity");
  identity.append(node("h3", "", profile.name), node("p", "", `${t(games.get(sources.game))} · ${start} — ${end}`));
  heading.append(identity, node("p", "", t("nameMatching")));
  const grid = node("div", "kol-source-grid");
  grid.append(sourceCard("vod", summary.vod, profile, sources), sourceCard("live", summary.live, profile, sources));
  result.replaceChildren(heading, grid);
  result.hidden = false;
  empty.hidden = true;
  setStatus("resultStatus", { name: profile.name });
}

function choose(profile) {
  current.profile = profile;
  nameInput.value = profile.name;
  matches.hidden = true;
  renderResult();
  result.focus({ preventScroll: true });
  result.scrollIntoView?.({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}

async function search() {
  lastAction = search;
  const query = nameInput.value.trim();
  clearResults();
  if (!query) { setStatus("enterName"); nameInput.focus(); return; }
  let range;
  try { range = validateDateRange(startInput.value, endInput.value); }
  catch (error) {
    setStatus(error.message === "reversed-date" ? "reversedDate" : "invalidDate");
    endInput.setAttribute("aria-invalid", "true");
    endInput.focus();
    return;
  }
  const request = sequence;
  const game = gameInput.value;
  busy(true);
  empty.hidden = true;
  setStatus("loading");
  const sources = await loadSources(game);
  if (request !== sequence) return;
  busy(false);
  if (!sources.vodIndex && !sources.liveData) { setStatus(null); setError("allFailed"); return; }
  if (sources.failed.length) setError("partialFailed", { source: sources.failed.join(" / ") });
  const directory = createKolDirectory(sources.vodIndex, sources.liveData);
  const candidates = searchKols(directory, query, 13);
  current = { sources, ...range, candidates: candidates.slice(0, 12), profile: null };
  const exact = candidates.filter((profile) => profile.aliases.some((alias) => normalizeName(alias) === normalizeName(query)));
  if (exact.length === 1 || candidates.length === 1) { choose(exact[0] || candidates[0]); return; }
  if (!candidates.length) { setStatus("noMatches"); return; }
  setStatus(candidates.length > 12 ? "moreMatches" : "selectMatch", { count: candidates.length });
  renderMatches();
}

function renderMatches() {
  if (!current?.candidates || current.profile) return;
  matches.replaceChildren(...current.candidates.map((profile) => {
    const button = node("button", "kol-match-button");
    button.type = "button";
    button.append(node("span", "", profile.name), node("small", "", [profile.vodNames.length && "VOD", profile.liveNames.length && "LIVE"].filter(Boolean).join(" + ")));
    button.addEventListener("click", () => choose(profile));
    return button;
  }));
  matches.hidden = !current.candidates.length;
}

const isoDay = (date) => date.toISOString().slice(0, 10);
function todayKst() { return new Date(`${isoDay(new Date(Date.now() + 9 * 3600000))}T00:00:00Z`); }
async function preset(kind) {
  lastAction = () => preset(kind);
  clearResults();
  const end = todayKst();
  const start = new Date(end);
  if (kind === "all") {
    const request = sequence;
    busy(true); setStatus("loadingPeriod");
    const sources = await loadSources(gameInput.value);
    if (request !== sequence) return;
    busy(false);
    const periods = [sources.vodIndex?.period, sources.liveData?.period].filter(Boolean);
    if (!periods.length) { setStatus(null); setError("allFailed"); return; }
    if (sources.failed.length) setError("partialFailed", { source: sources.failed.join(" / ") });
    startInput.value = periods.map((period) => period.start).sort()[0];
    endInput.value = periods.map((period) => period.end).sort().at(-1);
  } else {
    if (kind === "last-month") { end.setUTCDate(0); start.setTime(end); start.setUTCDate(1); }
    else start.setUTCDate(start.getUTCDate() - 29);
    startInput.value = isoDay(start); endInput.value = isoDay(end);
  }
  document.querySelectorAll("[data-kol-range]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.kolRange === kind)));
  setStatus(nameInput.value.trim() ? "changed" : null);
}

function applyLanguage() {
  for (const [attribute, target] of [["data-kol-i18n", null], ["data-kol-i18n-placeholder", "placeholder"], ["data-kol-i18n-aria", "aria-label"]]) {
    document.querySelectorAll(`[${attribute}]`).forEach((element) => {
      const text = t(element.getAttribute(attribute));
      if (target) element.setAttribute(target, text); else element.textContent = text;
    });
  }
  if (statusMessage) setStatus(statusMessage.key, statusMessage.values);
  if (errorMessage) setError(errorMessage.key, errorMessage.values);
  renderResult(); renderMatches();
}

form.addEventListener("submit", (event) => { event.preventDefault(); void search(); });
form.addEventListener("input", () => {
  clearResults(true);
  document.querySelectorAll("[data-kol-range]").forEach((button) => button.setAttribute("aria-pressed", "false"));
});
gameInput.addEventListener("change", () => clearResults(true));
document.querySelectorAll("[data-kol-range]").forEach((button) => button.addEventListener("click", () => void preset(button.dataset.kolRange)));
retry.addEventListener("click", () => { cache.clear(); if (lastAction) void lastAction(); });
addEventListener("datacitylanguagechange", (event) => {
  language = messages[event.detail?.language] ? event.detail.language : "ko";
  applyLanguage();
});
void preset("30d");
applyLanguage();
