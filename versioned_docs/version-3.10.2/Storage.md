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

The `Cleanup totals` cards are counters, not space estimates.

They show the cumulative number of media items Maintainerr has already handled across all collections, broken out into movie, show, season, and episode collections.

These counters increase when collection actions remove, unmonitor, or otherwise process media. They do not reset when a collection later becomes inactive, so they are best read as lifetime activity totals for the current Maintainerr database.

## Compute library sizes

The `Compute library sizes` button runs a deeper scan against your media server libraries.

Use it when you want per-library byte counts, but expect it to take longer on large libraries.

The reported sizes are approximate and may not exactly match filesystem usage when your storage relies on hardlinks, sparse files, or snapshots.

## Interpreting totals

Some mounts only report free space and not total capacity. When that happens, Maintainerr still shows the data it has, but some total-capacity numbers may stay unavailable.

Collection reclaim totals are also based on cached collection size data. If the numbers look stale, run normal collection processing and refresh the page.