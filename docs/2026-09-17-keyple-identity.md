# KEYPLE channel identity correction

The user confirmed `https://www.youtube.com/@키플/featured` as the intended KOC on 2026-09-17. YouTube Data API `channels.list(forHandle=@키플)` resolves to:

- Channel ID: `UCdOPKgTTrPArV9oamVVdL8g`
- Current channel title: `키플 KEYPLE`

The previous name-only alias `키플` instead tagged another channel, `UCtLnqpNLY-X3MR0A0ilgvhQ`, whose title is just `키플`.

The corrected KOC record uses the full canonical name `키플 KEYPLE` and the verified channel ID. Bound partner records match by channel ID only; a missing or different ID cannot be rescued by a matching title. The full canonical name also keeps the name-based compact search index from merging these two channels.

At correction time, all 39 saved videos from the verified channel were assigned to this KOC, and the incorrect KOC flag was removed from 15 videos belonging to the other channel. Both channels' otherwise relevant video records remain in the dataset. No videos or public metric values were added, removed, or altered; the dataset retains 44,065 videos and its 2026-09-17 statistics snapshot.
