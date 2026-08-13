import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const GAME_DATASET_FILES = {
  "wuthering-waves": resolve("data/wuthering-waves.js"),
  "neverness-to-everness": resolve("data/neverness-to-everness.js"),
  "zenless-zone-zero": resolve("data/zenless-zone-zero.js"),
};

let importSequence = 0;

export async function readGameDataset(game) {
  const file = GAME_DATASET_FILES[game];
  if (!file) throw new Error(`Unknown game dataset: ${game}`);
  globalThis.window = { GAME_DATA: {} };
  await import(`${pathToFileURL(file).href}?v=${Date.now()}-${importSequence += 1}`);
  const data = window.GAME_DATA?.[game];
  if (!data || !Array.isArray(data.videos)) throw new Error(`Invalid ${game} dataset`);
  return data;
}

export async function writeGameDataset(game, data) {
  const file = GAME_DATASET_FILES[game];
  if (!file) throw new Error(`Unknown game dataset: ${game}`);
  await writeFile(file, `window.GAME_DATA = window.GAME_DATA || {};\nwindow.GAME_DATA[${JSON.stringify(game)}] = ${JSON.stringify(data, null, 2)};\n`, "utf8");
  return file;
}
