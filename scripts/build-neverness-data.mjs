import { execFileSync } from "node:child_process";
import { writeGameDataset } from "./game-dataset.mjs";

const workbook = "V9C1sSLU4hOweEtvDRdcBnENnMh";
const sheet = "Sd2guS";

function run(args) {
  const command = process.platform === "win32" ? (process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe") : "lark-cli";
  const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", "lark-cli.cmd", ...args] : args;
  const output = execFileSync(command, commandArgs, {
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      LARKSUITE_CLI_NO_UPDATE_NOTIFIER: "1",
      LARKSUITE_CLI_NO_SKILLS_NOTIFIER: "1"
    }
  });
  return JSON.parse(output);
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

const csvResponse = run([
  "sheets", "+csv-get",
  "--spreadsheet-token", workbook,
  "--sheet-id", sheet,
  "--range", "A1:K59"
]);

const linkResponse = run([
  "sheets", "+cells-get",
  "--spreadsheet-token", workbook,
  "--sheet-id", sheet,
  "--range", "D1:E59",
  "--include", "value",
  "--max-chars", "100000"
]);

if (!csvResponse.ok || !linkResponse.ok) throw new Error("Failed to read the Neverness source sheet");
if (csvResponse.data.actual_range !== "A1:K59") throw new Error(`Unexpected source range: ${csvResponse.data.actual_range}`);
if (csvResponse.data.row_count !== 59 || csvResponse.data.has_more) throw new Error("The Neverness source sheet was not read completely");
if (linkResponse.data.has_more || linkResponse.data.returned_cell_count !== 118) throw new Error("The Neverness source links were not read completely");

const linksByRow = new Map();
const linkRange = linkResponse.data.ranges[0];
linkRange.row_indices.forEach((row, index) => {
  const linkCell = linkRange.cells[index]?.[1];
  const link = linkCell?.rich_text?.find((part) => part.type === "link")?.link;
  if (link) linksByRow.set(row, link);
});

const lines = csvResponse.data.annotated_csv.split(/\r?\n/);
const rows = lines.slice(1).map((line) => {
  const match = line.match(/^\[row=(\d+)\] ([\s\S]*)$/);
  if (!match) throw new Error(`Missing row marker: ${line}`);
  return { row: Number(match[1]), values: parseCsvLine(match[2]) };
});

if (rows.length !== 58) throw new Error(`Expected 58 videos, found ${rows.length}`);

const videos = rows.map(({ row, values }) => {
  const [, creator, subscribers, title, , sourceFormat, date, views, likes, comments] = values;
  const rawUrl = linksByRow.get(row);
  if (!rawUrl) throw new Error(`Missing YouTube link at row ${row}`);
  const url = new URL(rawUrl);
  const id = url.searchParams.get("v");
  if (!id) throw new Error(`Missing YouTube ID at row ${row}`);
  return {
    id,
    title,
    url: `https://www.youtube.com/watch?v=${id}`,
    creator,
    subscribers: subscribers ? Number(subscribers) : null,
    date,
    views: Number(views || 0),
    likes: likes ? Number(likes) : null,
    comments: comments ? Number(comments) : null,
    duration: 0,
    format: sourceFormat === "Video" ? "Shorts" : sourceFormat,
    isKoc: false,
    isKol: false,
    isAdTask: false
  };
});

const dates = videos.map((video) => video.date).sort();
const data = {
  generatedAt: new Date().toISOString(),
  period: { start: dates[0], end: dates.at(-1) },
  kocList: [],
  longTermKols: [],
  videos
};

const target = await writeGameDataset("neverness-to-everness", data);
console.log(`Built ${videos.length} Korean Neverness videos at ${target}`);
