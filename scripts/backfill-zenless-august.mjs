import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const start = "2026-08-01";
const end = "2026-08-13";
const updateFile = `data/zenless-youtube-update-${start}_${end}.json`;
function run(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: "inherit", env: process.env });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`)));
    child.on("error", reject);
  });
}
await run("scripts/collect-zenless-youtube-data-api.mjs", [
  `--start=${start}`, `--end=${end}`, "--windowDays=4", "--maxPages=2", `--output=${updateFile}`,
]);
await run("scripts/apply-zenless-youtube-update.mjs", [updateFile]);
const source = await readFile("dashboard.html", "utf8");
await writeFile("dashboard.html", source.replace(/data\/zenless-zone-zero\.js\?v=[^"]+/, `data/zenless-zone-zero.js?v=zenless-august-${Date.now()}`));
