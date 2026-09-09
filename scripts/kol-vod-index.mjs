const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const nonemptyText = (value) => typeof value === "string" && value.trim().length > 0;

function explicitAliases(dataset) {
  const groups = new Map();
  for (const list of [dataset.kolList, dataset.longTermKols, dataset.kocList]) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const name = typeof entry === "string" ? entry : entry?.name;
      if (!nonemptyText(name)) continue;
      const aliases = groups.get(name) ?? new Set();
      if (Array.isArray(entry?.aliases)) {
        for (const alias of entry.aliases) if (nonemptyText(alias)) aliases.add(alias);
      }
      groups.set(name, aliases);
    }
  }
  return [...groups].sort(([left], [right]) => compareText(left, right))
    .map(([name, aliases]) => ({ name, aliases: [...aliases].sort(compareText) }));
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Compact upload-date metrics for every creator, without titles or video URLs.
 * Day tuples: [date, format, count, views, likes, comments,
 *              viewsKnown, likesKnown, commentsKnown].
 * Metrics are current source snapshots, not views gained on the upload date.
 * First valid occurrence of a video ID wins; rows without IDs remain separate.
 * Missing/negative/nonfinite metrics contribute zero and no known count.
 */
export function buildKolVodIndex(game, dataset) {
  if (!nonemptyText(game) || !dataset || !Array.isArray(dataset.videos)) {
    throw new TypeError("A game name and a dataset with videos are required.");
  }
  const seenIds = new Set();
  const creators = new Map();
  for (const video of dataset.videos) {
    if (!video || !nonemptyText(video.creator) || !validDate(video.date)) continue;
    const id = nonemptyText(video.id) ? video.id : null;
    if (id && seenIds.has(id)) continue;
    if (id) seenIds.add(id);

    const creator = creators.get(video.creator) ?? { days: new Map(), canonicalNames: new Set() };
    for (const name of [video.kolName, video.kocName]) {
      if (nonemptyText(name)) creator.canonicalNames.add(name);
    }
    const format = nonemptyText(video.format) ? video.format : "Unknown";
    const key = JSON.stringify([video.date, format]);
    const day = creator.days.get(key) ?? [video.date, format, 0, 0, 0, 0, 0, 0, 0];
    day[2] += 1;
    for (const [index, metric] of [video.views, video.likes, video.comments].entries()) {
      if (!Number.isFinite(metric) || metric < 0) continue;
      day[index + 3] += metric;
      day[index + 6] += 1;
    }
    creator.days.set(key, day);
    creators.set(video.creator, creator);
  }

  return {
    version: 1,
    game,
    generatedAt: dataset.generatedAt ?? null,
    period: { start: dataset.period?.start ?? null, end: dataset.period?.end ?? null },
    aliases: explicitAliases(dataset),
    creators: [...creators].sort(([left], [right]) => compareText(left, right))
      .map(([name, creator]) => ({
        name,
        ...(creator.canonicalNames.size === 1 ? { canonicalName: [...creator.canonicalNames][0] } : {}),
        days: [...creator.days.values()].sort((left, right) => compareText(left[0], right[0]) || compareText(left[1], right[1])),
      })),
  };
}
