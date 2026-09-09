import { stat } from "node:fs/promises";
import { GAME_DATASET_FILES, readGameDataset, writeKolSearchIndex } from "./game-dataset.mjs";

for (const game of Object.keys(GAME_DATASET_FILES)) {
  const dataset = await readGameDataset(game);
  const file = await writeKolSearchIndex(game, dataset);
  const { size } = await stat(file);
  console.log(`${game}: ${dataset.videos.length.toLocaleString("en-US")} source videos → ${size.toLocaleString("en-US")} bytes (${file})`);
}
