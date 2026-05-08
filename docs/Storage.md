---
id: storage-metrics-feature
slug: /storage-metrics
description: Review disk usage and reclaimable space from Maintainerr collections.
title: Storage Metrics
---

The `Storage` page shows how much space your configured services are using and how much space Maintainerr could reclaim from active collections.

## What the page shows

Storage Metrics combines several views:

- total capacity, used space, and free space across configured mounts
- cumulative cleanup totals for media Maintainerr has already handled, split by collection type
- reclaimable bytes from active collections
- disk usage grouped by Radarr and Sonarr instance
- media server library counts and optional library size estimates
- the largest collections by cached total size

## Requirements

To get useful data here:

- configure at least one Radarr or Sonarr instance for disk and mount reporting
- configure Plex or Jellyfin if you want media server library counts
- let collection processing run so cached collection sizes stay fresh

If Maintainerr cannot reach a configured service, the page will show an error or partial data instead of blocking the whole view.

## Cleanup totals

The `Cleanup totals` cards are counters paired with reclaimed-byte totals, not future space estimates.

They show the cumulative number of media items Maintainerr has already handled across all collections, broken out into movie, show, season, and episode collections, plus the reclaimed on-disk bytes for each type.

Item counters increase when collection actions process media. Reclaimed-byte totals only increase for delete-style actions that actually free disk space; unmonitor and quality-profile changes do not add reclaimed bytes.

These totals do not reset when a collection later becomes inactive, so they are best read as lifetime activity totals for the current Maintainerr database.

## Potential reclaim by type

The `Potential reclaim by type` section breaks reclaimable collection space into separate movie, show, season, and episode panels.

Each panel shows:

- the estimated reclaimable bytes for that media type
- how many active delete-rule collections of that type contribute to the estimate

If Maintainerr is still backfilling per-item size data, these panels temporarily fall back to cached per-collection totals. In that mode duplicates across multiple collections are not fully deduplicated yet, so the estimate can be higher until the next collection size refresh completes.

## Compute library sizes

The `Compute library sizes` button runs a deeper scan against your media server libraries.

Use it when you want per-library byte counts, but expect it to take longer on large libraries.

The reported sizes are approximate and may not exactly match filesystem usage when your storage relies on hardlinks, sparse files, or snapshots.

## Interpreting totals

Some mounts only report free space and not total capacity. When that happens, Maintainerr still shows the data it has, but some total-capacity numbers may stay unavailable.

Collection reclaim totals are also based on cached collection size data. If the numbers look stale, run normal collection processing and refresh the page.
