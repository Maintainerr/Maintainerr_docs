---
slug: /api/metadata-and-storage
title: Metadata, Storage and Events API
description: Metadata provider lookups, storage metrics, library sizes, and the server-sent events stream.
---

Three unrelated groups that share a page: metadata provider lookups for artwork and descriptions, storage usage figures, and the live event stream the UI subscribes to.

See [API conventions](../API.md#api-conventions) for the rules that apply across the API.

## Metadata

The three metadata routes resolve artwork and descriptions from the configured providers. They all behave the same way, so the shared rules are worth reading once.

**How ids are supplied.** These routes do not declare named query parameters. Any non-empty query key ending in the literal string `Id` is treated as a provider id namespace, with the trailing `Id` stripped and the value converted to a number where it looks numeric. The useful ones are `tmdbId`, `tvdbId`, `imdbId` and `sportarrId`, but an unrecognised key such as `fooId` is also accepted and offered to the providers as an external id namespace. The suffix is case-sensitive: `tmdbID` and `tmdb` are both ignored.

`itemId` is the one exception. It is excluded from the id bag and is instead read as a media-server item id.

**Which provider answers.** Providers are consulted in the order set by your metadata provider preference, filtered to those actually available. TMDB is always available because a shared key ships with Maintainerr. TVDB only answers when a TVDB API key is saved. Sportarr is moved to the front for ids it owns. Missing provider ids are filled in first where possible, including bridging from an IMDB id, since there is no IMDB provider of its own.

**Seasons and episodes.** Pass `itemId` alongside `type=show` to resolve a season or episode against its parent show. Without `itemId` a season request resolves as if it were the show.

:::note
All three routes fail open and silently. An unreachable provider, a rejected id, or an unreadable media-server item all produce an empty `200` body, never a `404` or a `502`. An empty body is indistinguishable from "the provider had nothing".
:::

The id check runs before the type check, so a request with an invalid `type` but no `*Id` parameter returns an empty `200` rather than the `400` you would expect.

### `GET /api/metadata/image/{type}`

**Resolve a poster image URL for an item from the configured metadata providers.**

| Parameter                                  | Type  | Required | Description                                                           |
| ------------------------------------------ | ----- | -------- | --------------------------------------------------------------------- |
| `type`                                     | path  | Yes      | `movie` or `show`. Anything else is a `400`                           |
| `itemId`                                   | query | No       | Media-server item id. Resolves a season or episode against its show   |
| `tmdbId`, `tvdbId`, `imdbId`, `sportarrId` | query | No       | Provider ids. At least one `*Id` key is needed for any work to happen |

Response:

```json
{
  "url": "https://image.tmdb.org/t/p/w300_and_h450_face/example.jpg",
  "provider": "TMDB",
  "id": 12345
}
```

`provider` is `TMDB`, `TVDB` or `Sportarr`, and `id` is the provider id actually used.

| Status | Cause                                                                                |
| ------ | ------------------------------------------------------------------------------------ |
| `200`  | A result object, or an empty body when no ids were given or no provider had a poster |
| `400`  | `type` is not `movie` or `show`, and at least one `*Id` was supplied                 |

The poster size is fixed and cannot be overridden by a query parameter. Episodes get their season's poster, because no provider holds a portrait image per episode. The URL points at the provider's own image host, so the browser must be able to reach it. Maintainerr does not proxy the bytes.

### `GET /api/metadata/backdrop/{type}`

**Resolve a backdrop, or an episode still, from the configured metadata providers.**

Takes the same parameters and returns the same shape as the poster route.

| Parameter                                  | Type  | Required | Description                                                      |
| ------------------------------------------ | ----- | -------- | ---------------------------------------------------------------- |
| `type`                                     | path  | Yes      | `movie` or `show`. Anything else is a `400`                      |
| `itemId`                                   | query | No       | Media-server item id. Needed for an episode to get its own still |
| `tmdbId`, `tvdbId`, `imdbId`, `sportarrId` | query | No       | Provider ids. At least one `*Id` key is required                 |

| Status | Cause                                                                |
| ------ | -------------------------------------------------------------------- |
| `200`  | A result object, or an empty body when nothing resolved              |
| `400`  | `type` is not `movie` or `show`, and at least one `*Id` was supplied |

With an episode reference TMDB returns the episode still. Seasons keep the show backdrop, because TMDB publishes no season backdrop. TVDB ignores the size hint.

### `GET /api/metadata/overview/{type}`

**Fetch a provider description for an item, for use where the media server has none.**

The UI only calls this when the media server itself returned no summary.

| Parameter                                  | Type  | Required | Description                                                            |
| ------------------------------------------ | ----- | -------- | ---------------------------------------------------------------------- |
| `type`                                     | path  | Yes      | `movie` or `show`. Anything else is a `400`                            |
| `itemId`                                   | query | No       | Media-server item id. Enables season and episode specific descriptions |
| `tmdbId`, `tvdbId`, `imdbId`, `sportarrId` | query | No       | Provider ids. At least one `*Id` key is required                       |

Response:

```json
{ "overview": "A description of the item." }
```

The body is empty when there is no description at all.

| Status | Cause                                                                |
| ------ | -------------------------------------------------------------------- |
| `200`  | An overview, or an empty body when nothing was found                 |
| `400`  | `type` is not `movie` or `show`, and at least one `*Id` was supplied |

This is the most expensive of the three routes. With `itemId` it can make two media-server reads before it even starts asking providers. TMDB descriptions are requested in English regardless of your media server's locale. TVDB has no description below show level, so on a TVDB-only setup season and episode requests always fall back to the series overview.

## Storage metrics

### `GET /api/storage-metrics`

**Aggregate disk space, media server and collection storage figures into one snapshot.**

Reads every Radarr and Sonarr instance's disk space and root folders, deduplicates mounts so a shared NAS mounted by two instances is only counted once, and combines that with collection totals and media-server library counts. This is what the Storage page renders.

Response, abbreviated:

```json
{
  "generatedAt": "2026-06-05T12:00:00.000Z",
  "totals": {
    "freeSpace": 0,
    "totalSpace": 0,
    "usedSpace": 0,
    "mountCount": 0,
    "accurateMountCount": 0,
    "accurateTotalSpace": true
  },
  "mounts": [
    {
      "instanceId": 1,
      "instanceType": "radarr",
      "instanceName": "Radarr",
      "path": "/movies",
      "label": "/",
      "freeSpace": 0,
      "totalSpace": 0,
      "hasAccurateTotalSpace": true
    }
  ],
  "instances": [
    {
      "id": 1,
      "name": "Radarr",
      "type": "radarr",
      "ok": true,
      "error": null,
      "mountCount": 1
    }
  ],
  "mediaServer": {
    "configured": true,
    "serverType": "plex",
    "serverName": "My server",
    "reachable": true,
    "error": null,
    "libraries": [
      {
        "id": "1",
        "title": "Movies",
        "type": "movie",
        "itemCount": 0,
        "sizeBytes": null
      }
    ],
    "totalItemCount": 0
  },
  "collectionSummary": {
    "reclaimableCount": 0,
    "activeSizeBytes": 0,
    "reclaimableSizedCount": 0,
    "inactiveCount": 0,
    "totalCollectionCount": 0,
    "movieSizeBytes": 0,
    "showSizeBytes": 0,
    "seasonSizeBytes": 0,
    "episodeSizeBytes": 0,
    "reclaimableMovieCount": 0,
    "reclaimableShowCount": 0,
    "reclaimableSeasonCount": 0,
    "reclaimableEpisodeCount": 0,
    "reclaimableUsingFallback": false
  },
  "topCollections": [
    {
      "id": 1,
      "title": "Example collection",
      "type": "movie",
      "mediaCount": 0,
      "totalSizeBytes": 0,
      "isActive": true
    }
  ],
  "cleanupTotals": {
    "itemsHandled": 0,
    "moviesHandled": 0,
    "showsHandled": 0,
    "seasonsHandled": 0,
    "episodesHandled": 0,
    "bytesHandled": 0,
    "movieBytesHandled": 0,
    "showBytesHandled": 0,
    "seasonBytesHandled": 0,
    "episodeBytesHandled": 0
  }
}
```

| Status | Cause                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------- |
| `200`  | Normal. Per-instance and media-server failures are reported inside the payload, not as an HTTP error |
| `500`  | One of the underlying database reads threw                                                           |

Each source fails open independently. An `*arr` instance with no URL or API key comes back with `ok: false` and an error of `Instance is not fully configured`. One whose disk-space read fails reports its error and contributes no mounts. The media-server block distinguishes three states: `configured: false` when no server type is set, `reachable: false` with `error: null` when a type is set but the adapter is not, and `reachable: false` with a message when a library read failed. None of these change the status code.

Two figures need care. `totals` only sums capacity for mounts flagged `hasAccurateTotalSpace`, because Sonarr omits network drives from its disk-space report and those arrive without a capacity. And `collectionSummary.activeSizeBytes` only deduplicates items shared across collections while every reclaimable collection has per-item sizes. Otherwise it falls back to cached per-collection totals, sets `reclaimableUsingFallback: true`, and counts shared items more than once.

`mediaServer.libraries[].sizeBytes` comes from the cheap path and is `null` for Plex and Emby by design. Only Jellyfin 10.11 and newer with an admin user answers, and its figure is device-level used space summed over the library's folders, not a media-file total. For accurate numbers use `/api/storage-metrics/library-sizes`.

Disk-space reads are cached per instance for an hour, so repeated calls within that window return the same `*arr` figures. Only the database reads are always fresh.

### `GET /api/storage-metrics/library-sizes`

**Compute accurate per-library byte totals by iterating every item on the media server.**

Walks every movie and episode on the media server and sums their file sizes.

Response:

```json
{
  "generatedAt": "2026-06-05T12:00:00.000Z",
  "sizeBytesByLibrary": { "1": 0, "2": 0 }
}
```

Keys are media-server library ids. Plex and Jellyfin set an entry for every library, possibly `0`. Emby only sets libraries whose total came out above zero, so a failed or empty Emby library is simply absent.

| Status | Cause                                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `200`  | The computed, or cached, map                                                                                                  |
| `500`  | The computation threw, for example when the library list could not be read                                                    |
| `503`  | No media server configured, the adapter is not set up, a media-server switch is in progress, or credentials are not saved yet |

:::warning Expensive
This iterates every item on the media server and on Plex adds a per-item request for anything whose paged record lacks a size. On a large library it generates a very large number of media-server calls. Call it on demand, not on a schedule.
:::

Results are cached for 15 minutes. There is no invalidation when the library changes, so a fresh figure needs a call after the cache expires. Concurrent callers share one in-flight computation, and a failed computation is not cached.

Partial failures are mostly silent. A failed page read returns the running total, a failed Plex show-library read returns `0` after a warning, and Emby omits a failed library from the map entirely. A library can therefore be under-reported, reported as `0`, or missing without any error reaching you.

This is independent of the cheap `sizeBytes` in `GET /api/storage-metrics`. Calling it does not update that payload.

## Events

### `GET /api/events/stream`

**Open a Server-Sent Events stream of rule-handler and collection-handler progress events.**

A long-lived `text/event-stream` connection. Headers flush immediately and the stream stays open until the client disconnects or the app shuts down. A `: ping` comment is written every 30 seconds to keep it alive.

Each message looks like this:

```text
event: collection_handler.progressed
id: 42
data: {"type":"collection_handler.progressed","time":"2026-06-05T12:00:00.000Z","totalCollections":3}

```

Seven event types are emitted:

| Event                                                       | Payload                                                                                                                                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rule_handler.started`, `rule_handler.finished`             | `type`, `time`, `message`                                                                                                                                                        |
| `rule_handler.progressed`                                   | `type`, `time`, `ruleGroupName`, `totalEvaluations`, `processedEvaluations`                                                                                                      |
| `collection_handler.started`, `collection_handler.finished` | `type`, `time`, `message`                                                                                                                                                        |
| `collection_handler.progressed`                             | `type`, `time`, `totalCollections`, `totalMediaToHandle`, `processedMedias`, `processedCollections`, and `processingCollection` with `name`, `processedMedias` and `totalMedias` |
| `rule_handler_queue.status_updated`                         | `type`, `time`, and `data` with `processingQueue`, `executingRuleGroupId`, `pendingRuleGroupIds` and `queue`                                                                     |

| Status | Cause                                                                         |
| ------ | ----------------------------------------------------------------------------- |
| `200`  | Headers flush as soon as the handler runs. There is no other reachable status |

Send a `Last-Event-ID` header to ask for a replay of buffered events. Replay is best effort: at most 100 events are buffered, they expire after 5 minutes, and ids restart from 1 on every process start. A client reconnecting after a restart normally holds an id higher than any new id, so its backlog is silently skipped. When no replay happens the server may instead resend the most recent event if it is under 5 seconds old, which can duplicate an event the client already has.

Only these seven of Maintainerr's event types reach the stream. Collection media added, removed and handled events, the failure events, and the notification, settings and overlay events are not on it.
