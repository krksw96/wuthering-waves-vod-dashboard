# September VOD coverage reconciliation

Audit date: 2026-09-16. Publication dates use Asia/Seoul.

## Scope and result

- Rechecked 2026-09-01 through 2026-09-16 using the saved 2,732-channel registry and 5 newly discovered channels.
- Inspected 20,470 upload-list video IDs in that date range and supplemented them with keyword searches.
- Added 690 previously absent videos from 281 channels. Dataset size: 43,310 → 44,000.
- Added 12 previously absent 앙리형 videos, including all five reported IDs: `RwVLGGKYoYI`, `-SnWd-GG1sc`, `Z_aox2-V4TE`, `gx6qYLzrsaY`, `LfmtnbfaeNw`.
- Preserved existing records; this reconciliation is additive, not a retrospective removal of historical entries.
- Requested current statistics for all 44,000 saved IDs. YouTube returned 43,530 public video records; the 470 unavailable records retain their previous values. This audit used 18 search calls and 4,269 general API calls, including the full statistics refresh; these are this operation's counters, not a cloud-project daily quota balance.

## Cause and prevention

The old daily job relied on limited search result pages for yesterday and today. Search is not an exhaustive channel-upload inventory. A September 3 job also failed after exhausting its search quota. The daily job now searches recent uploads, reconciles a rolling 14-day window against all registered channel upload lists, and extends the window after missed runs. Search-quota exhaustion preserves already collected results and still permits channel reconciliation.

`경연`, `여우의 별자리`, and `쇄명` are included in the shared search configuration. Collection and filtering share normalized title/description classification. Game chapters and short game descriptions can establish relevance even when titles do not name the game. Broad channel tags, promotional links, unrelated-game titles, character-name substrings, astrology's use of “명조”, and disclosed AI-generated content do not establish relevant gameplay coverage.

## Limits and evidence

No channel reached the 50-page upload-list cap. Twenty upload lists returned unavailable/not-found responses, and eleven registered channels returned no upload playlist. One supplemental broad search reached its five-page limit. Public, accessible uploads with identifiable game context are covered by this audit; deleted/private videos, unregistered channels not surfaced in search, or videos with no identifiable game metadata cannot be guaranteed complete.

Detailed collection counters, rejected-candidate counts, and unavailable-channel IDs are recorded in `data/youtube-update-2026-09-01_2026-09-16-coverage.json`. Rejected new candidates were checked for common cross-game false positives; mixed-game videos with actual Wuthering Waves chapters were retained. The registry is stored in `data/wuthering-waves-channels.json` and grows with successful refreshes.
