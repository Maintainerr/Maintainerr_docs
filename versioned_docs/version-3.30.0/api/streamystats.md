---
slug: /api/streamystats
title: Streamystats API
description: Streamystats endpoints for server info and per-item watch statistics.
---

Two read-only endpoints that surface [Streamystats](https://github.com/fredrikburmester/streamystats) watch data inside the media modal. Both are **Jellyfin only**: with Plex or Emby as the active media server they answer `403`.

Both need a saved Streamystats URL **and** a saved Jellyfin API key. The Streamystats client is only built when both are present, so a missing Jellyfin key looks exactly like a missing Streamystats URL.

See [API conventions](../API.md#api-conventions) for the rules that apply to every endpoint.

## Endpoints

### `GET /api/streamystats/info`

**Return the configured Streamystats URL and the Streamystats server id that matches your Jellyfin server.**

Maintainerr asks Streamystats for its server list and matches an entry against your Jellyfin server, first by URL and then by a case-insensitive name match. The match is remembered until Streamystats settings or Jellyfin settings change. The UI calls this when a media modal opens and uses the result to build a deep link of the form `<url>/servers/<serverId>/library/<itemId>`.

Response:

```json
{
  "url": "https://streamystats.example.com",
  "serverId": 1
}
```

`url` is the saved value exactly as stored, with no trailing-slash normalisation. `serverId` is `null` when no Streamystats server matched your Jellyfin instance or when the server list could not be read.

| Status | Cause                                                                              |
| ------ | ---------------------------------------------------------------------------------- |
| `200`  | Read succeeded. `serverId` may still be `null`                                     |
| `403`  | The active media server is not Jellyfin                                            |
| `404`  | Streamystats is not configured, meaning no Streamystats URL or no Jellyfin API key |

A `serverId` of `null` is not an error and does not change the status code. Maintainerr retries the server-list lookup on every request until a match is found, so an unreachable Streamystats instance keeps answering `200` with a null id, and the UI quietly drops the Streamystats link.

### `GET /api/streamystats/items/{itemId}`

**Return Streamystats watch statistics for one Jellyfin library item.**

Resolves the Streamystats server id the same way as `/info`, then asks Streamystats for that item's statistics. The response is validated before it is returned, and numeric fields are coerced from strings because Streamystats sends aggregate totals as text.

| Parameter | Type   | Required | Description                                                                                                                          |
| --------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `itemId`  | string | Yes      | Jellyfin item id, the same id used by `GET /api/media-server/meta/{id}`. It is not validated and is passed to Streamystats unescaped |

Response:

```json
{
  "item": { "id": "abc123", "name": "Example title", "type": "Series" },
  "totalViews": 12,
  "totalWatchTime": 34567,
  "completionRate": 0.87,
  "firstWatched": "2026-01-02T10:00:00.000Z",
  "lastWatched": "2026-03-04T21:15:00.000Z",
  "usersWatched": [
    {
      "user": { "id": "u1", "name": "example-user" },
      "watchCount": 3,
      "totalWatchTime": 8400,
      "completionRate": 1,
      "firstWatched": "2026-01-02T10:00:00.000Z",
      "lastWatched": "2026-02-01T20:00:00.000Z"
    }
  ],
  "watchHistory": [
    {
      "user": { "id": "u1", "name": "example-user" },
      "watchDate": "2026-02-01T20:00:00.000Z",
      "watchDuration": 2800,
      "completionPercentage": 98,
      "playMethod": "DirectPlay",
      "deviceName": "Living room",
      "clientName": "Jellyfin Web"
    }
  ],
  "watchCountByMonth": [
    {
      "month": 2,
      "year": 2026,
      "watchCount": 4,
      "uniqueUsers": 2,
      "totalWatchTime": 11200
    }
  ],
  "episodeStats": {
    "totalSeasons": 3,
    "totalEpisodes": 30,
    "watchedEpisodes": 21,
    "watchedSeasons": 2
  }
}
```

`episodeStats` is only present for series. `firstWatched` and `lastWatched` are `null` when nothing has been watched.

| Status | Cause                                                                 |
| ------ | --------------------------------------------------------------------- |
| `200`  | Statistics returned                                                   |
| `403`  | The active media server is not Jellyfin                               |
| `404`  | Streamystats is not configured, or no data is available for this item |

The second `404` covers four different situations: the Streamystats server id could not be resolved, Streamystats does not know the item, the request to Streamystats failed or timed out, and the payload failed validation. A `404` is therefore not proof that the item has no watch history.

Successful responses are cached in memory for 20 minutes, keyed by item and server id. A transport failure is never cached and is retried on the next request, but a response that fails validation is cached, so that item keeps answering `404` for the full 20 minutes.
