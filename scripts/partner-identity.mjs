const normalizeAlias = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

// Channel-bound partners must never inherit membership from a display name.
// Other partners retain the existing alias matching until their IDs are known.
export function createPartnerIdentityMatcher(partners) {
  const byChannelId = new Map();
  const byAlias = new Map();
  for (const partner of partners) {
    if (Object.prototype.hasOwnProperty.call(partner, "channelIds")) {
      if (!Array.isArray(partner.channelIds)) throw new TypeError(`channelIds must be an array for ${partner.name}`);
      for (const value of partner.channelIds) {
        const channelId = String(value || "").trim();
        if (channelId) byChannelId.set(channelId, partner.name);
      }
      continue;
    }
    for (const alias of partner.aliases || []) byAlias.set(normalizeAlias(alias), partner.name);
  }
  return (video) => byChannelId.get(String(video.channelId || "").trim())
    || byAlias.get(normalizeAlias(video.channelTitle || video.creator))
    || null;
}
