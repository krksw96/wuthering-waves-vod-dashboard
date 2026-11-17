import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readGameDataset, writeGameDataset } from './game-dataset.mjs';
import { runSync } from '../koc/scripts/sync-lark.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Source membership is authoritative for KOC status, not a channel-name guess.
// Existing YouTube metrics/dates always win; the sheet supplements missing videos.
export function mergeKocReference(current, reference) {
  if (reference.mode !== 'live' || !reference.videos?.length || !reference.source?.url) throw new Error('Valid KOC reference data is required');
  const videos = new Map(current.videos.map(video => [video.id, { ...video }]));
  let added = 0, matched = 0, skipped = 0;
  for (const row of reference.videos) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(row.id) || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || row.date < current.period.start || row.date > current.period.end) { skipped++; continue; }
    const existing = videos.get(row.id);
    if (existing) matched++;
    else added++;
    videos.set(row.id, {
      ...(existing || {
        id: row.id, title: row.title, url: row.url, creator: row.creator,
        channelId: null, subscribers: null, date: row.date,
        views: row.views, likes: row.likes, comments: null, duration: null,
        format: row.format, isKol: false, kolName: null, isAdTask: false,
        metricsSource: 'lark-koc-reference', metricsUpdatedAt: reference.metricUpdatedAt || null,
      }),
      isKoc: true, kocName: existing?.kocName || row.creator,
      kocReference: { sourceRow: row.sourceRow, publishedDate: row.date, version: row.version, topics: row.topics },
    });
  }
  return {
    data: { ...current, kocReference: { url: reference.source.url, generatedAt: reference.generatedAt, metricUpdatedAt: reference.metricUpdatedAt, added, matched, skipped }, videos: [...videos.values()].sort((a, b) => b.date.localeCompare(a.date) || (b.views || 0) - (a.views || 0)) },
    added, matched, skipped,
  };
}

export async function main() {
  // Cloud automation may read the source when credentials have been configured.
  // Without credentials, use the last authenticated snapshot; never embed login URLs.
  if (process.env.LARK_USER_ACCESS_TOKEN || (process.env.LARK_APP_ID && process.env.LARK_APP_SECRET)) {
    await runSync([]);
  }
  const reference = JSON.parse(await readFile(resolve(root, 'koc/data/koc-data.json'), 'utf8'));
  const current = await readGameDataset('wuthering-waves');
  const result = mergeKocReference(current, reference);
  await writeGameDataset('wuthering-waves', result.data);
  const htmlPath = resolve(root, 'dashboard.html');
  const html = await readFile(htmlPath, 'utf8');
  await writeFile(htmlPath, html.replace(/data\/wuthering-waves\.js\?v=[^"]+/, `data/wuthering-waves.js?v=koc-${Date.now()}-${result.data.videos.length}`), 'utf8');
  console.log(JSON.stringify({ added: result.added, matched: result.matched, skipped: result.skipped, referenceGeneratedAt: reference.generatedAt }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
