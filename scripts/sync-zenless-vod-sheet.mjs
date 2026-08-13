import vm from "node:vm";

const spreadsheetToken = process.env.SPREADSHEET_TOKEN || "V9C1sSLU4hOweEtvDRdcBnENnMh";
const sheetId = process.env.ZENLESS_VOD_SHEET_ID || "XJKrFe";
const sourceUrl = process.env.ZENLESS_VOD_DATA_URL || "https://raw.githubusercontent.com/krksw96/wuthering-waves-vod-dashboard/main/data/zenless-zone-zero.js";
const appId = process.env.FEISHU_APP_ID;
const appSecret = process.env.FEISHU_APP_SECRET;
if (!appId || !appSecret) throw new Error("FEISHU_APP_ID and FEISHU_APP_SECRET are required");

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`https://open.feishu.cn${path}`, {
    method,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok || (data.code !== undefined && data.code !== 0)) throw new Error(`${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}

const auth = await request("/open-apis/auth/v3/tenant_access_token/internal", {
  method: "POST", body: { app_id: appId.trim(), app_secret: appSecret.trim() },
});
const token = auth.tenant_access_token;
const sourceResponse = await fetch(sourceUrl);
if (!sourceResponse.ok) throw new Error(`Zenless VOD data download failed: ${sourceResponse.status}`);
const sandbox = { window: { GAME_DATA: {} } };
vm.runInNewContext(await sourceResponse.text(), sandbox);
const videos = sandbox.window.GAME_DATA?.["zenless-zone-zero"]?.videos;
if (!Array.isArray(videos)) throw new Error("Zenless VOD data is invalid");

const headers = ["NO.", "유튜버 이름", "유튜버 구독자 수", "제목", "링크", "형식", "날짜", "조회수", "좋아요 수", "댓글 수", "검색 키워드"];
const values = [headers, ...videos.slice().sort((a, b) => b.date.localeCompare(a.date) || b.views - a.views).map((video, index) => [
  index + 1, video.creator, video.subscribers ?? "", video.title, video.url, video.format, video.date,
  video.views ?? 0, video.likes ?? "", video.comments ?? 0, video.searchKeyword || "",
])];
const cell = (value, index, row) => {
  if (row > 0 && index === 4 && value) return { rich_text: [{ type: "link", text: "LINK", link: value }] };
  return { value: value == null ? "" : ([0, 2, 7, 8, 9].includes(index) && row > 0 ? Number(value) : String(value)) };
};
for (let offset = 0; offset < values.length; offset += 100) {
  const batch = values.slice(offset, offset + 100);
  await request(`/open-apis/sheet_ai/v2/spreadsheets/${spreadsheetToken}/tools/invoke_write`, {
    method: "POST", token,
    body: { tool_name: "set_cell_range", input: JSON.stringify({ excel_id: spreadsheetToken, sheet_id: sheetId, range: `${sheetId}!A${offset + 1}:K${offset + batch.length}`, cells: batch.map((row, rowIndex) => row.map((value, index) => cell(value, index, offset + rowIndex))) }) },
  });
}
const verification = await request(`/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/values/${encodeURIComponent(`${sheetId}!A1:K${values.length}`)}`, { token });
const actual = verification.data?.valueRange?.values || [];
if (actual.length !== values.length || actual[0]?.[0] !== "NO.") throw new Error(`Sheet verification failed: expected ${values.length} rows, got ${actual.length}`);
console.log(JSON.stringify({ sheetId, videos: videos.length, rows: actual.length }));
