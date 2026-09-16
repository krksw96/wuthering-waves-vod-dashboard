const DAY_MS = 86_400_000;

function dateAtNoon(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error(`Invalid collection date: ${value}`);
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid collection date: ${value}`);
  }
  return date;
}

const daysBefore = (value, days) => new Date(dateAtNoon(value).getTime() - days * DAY_MS).toISOString().slice(0, 10);

export function buildDailyRefreshPlan(current, end) {
  dateAtNoon(end);
  const previousEnd = current?.period?.end;
  if (previousEnd) dateAtNoon(previousEnd);
  // Revisit the previous collection day as well: an 08:00 collection cannot
  // include videos that were published later that day.
  const yesterday = daysBefore(end, 1);
  const catchupStart = previousEnd && previousEnd < yesterday ? daysBefore(previousEnd, 1) : null;
  const searchStart = [yesterday, catchupStart].filter(Boolean).sort()[0];
  const uploadsStart = [daysBefore(end, 13), catchupStart].filter(Boolean).sort()[0];
  return {
    end,
    searchStart,
    uploadsStart,
    rollingDays: 14,
    catchingUp: searchStart < yesterday,
    maxSearchCalls: 85,
    maxPlaylistPages: 50,
  };
}

export function mergeChannelRegistry(existing, videos, updatedAt) {
  if (existing && !Array.isArray(existing.channels)) throw new Error("Channel registry must have a channels array");
  const channels = new Map((existing?.channels || []).map((channel) => [channel.channelId, { ...channel }]));
  for (const video of videos) {
    if (!video.channelId) continue;
    const previous = channels.get(video.channelId) || {};
    channels.set(video.channelId, {
      ...previous,
      channelId: video.channelId,
      title: video.creator || previous.title || "",
      firstSeenAt: previous.firstSeenAt || updatedAt,
      lastSeenAt: updatedAt,
    });
  }
  return {
    ...(existing || {}),
    generatedAt: updatedAt,
    channels: [...channels.values()].sort((a, b) => a.channelId.localeCompare(b.channelId)),
  };
}
