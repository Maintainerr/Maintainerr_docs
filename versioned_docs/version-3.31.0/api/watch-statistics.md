---
slug: /api/watch-statistics
title: Watch statistics API
description: Per-item Tautulli and Tracearr watch statistics for the media modal.
---

Two read-only endpoints behind the watch statistics panels in the media modal: one for [Tautulli](https://tautulli.com/), one for [Tracearr](https://github.com/connorgallopo/Tracearr). They answer in the same shape and share the same status contract.

Streamystats has its own richer payload, on the [Streamystats](./streamystats.md) page.

See [API conventions](../API.md#api-conventions) for the rules that apply to every endpoint.

## The shared response

```json
{
  "url": "https://tracearr.example.com/media/2f1c...",
  "plays": 7,
  "watchTime": 18540,
  "lastWatched": "2026-03-04T21:15:00.000Z",
  "users": [
    {
      "name": "example-user",
      "plays": 5,
      "watchTime": 13200,
      "lastWatched": "2026-03-04T21:15:00.000Z"
    }
  ]
}
```

| Field         | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `url`         | The item's page on the statistics service. Left out when there is not one |
| `plays`       | Total plays counted for the item                                          |
| `watchTime`   | Total watch time in **seconds**                                           |
| `lastWatched` | ISO date-time of the newest play, or `null`                               |
| `users`       | Per-user totals, each with `name`, `plays`, `watchTime` and `lastWatched` |

Both endpoints share one status contract:

| Status | Cause                                                    |
| ------ | -------------------------------------------------------- |
| `200`  | The statistics above                                     |
| `403`  | Tautulli only: the active media server is not Plex       |
| `404`  | The service is not configured, or nobody played the item |
| `502`  | The service could not be read                            |

The split matters: `404` is a fact about the item, `502` is a failure to establish one. The media modal shows an empty panel for the first and an error for the second.

## Endpoints

### `GET /api/tautulli/items/{itemId}`

**Return Tautulli watch statistics for one Plex item.**

**Plex only.** With Jellyfin or Emby as the active media server this answers `403`, because Tautulli only knows Plex rating keys.

| Parameter | Type   | Required | Description                                                     |
| --------- | ------ | -------- | --------------------------------------------------------------- |
| `itemId`  | string | Yes      | Plex rating key. Not validated and passed to Tautulli unescaped |

The per-user totals come from Tautulli's `get_item_user_stats`. Those rows carry no dates, so every user's `lastWatched` is `null` and the overall `lastWatched` is read separately from the newest history row for the item. History is scoped by the item's own rating key for a movie or episode, by its parent for a season, and by its grandparent for a show, which is the same scope the Tautulli rule properties use.

`url` points at the item's history page on your Tautulli instance.

### `GET /api/tracearr/items/{itemId}`

**Return Tracearr watch statistics for one media server item.**

Works with Plex, Jellyfin and Emby. Only the Tracearr server bound in your settings is read, so plays recorded against another server are not counted.

Before reading, Maintainerr checks that this Tracearr server tracks your media server, the same check rule runs make. Plex rating keys repeat across servers, so without it another server's plays could be shown. If the check does not pass, the route answers `502` and waits a minute before checking again. A server that passes is kept until the Tracearr or media server settings change.

| Parameter | Type   | Required | Description                                                                 |
| --------- | ------ | -------- | --------------------------------------------------------------------------- |
| `itemId`  | string | Yes      | Media server item id, the same id used by `GET /api/media-server/meta/{id}` |

Statistics are read from Tracearr's history rather than from its per-title statistics, because those follow Tracearr's own media identity, which can merge two different items of one server and credit the wrong one with the other's plays.

- A movie or episode is looked up by its own rating key.
- A show or season has to be found by provider id first, trying TVDB, then TMDB, then IMDb. A show Tracearr cannot place that way answers `404` rather than reporting zero. Its plays are then narrowed to the show, or to that season's number.
- `url` points at the item's page on your Tracearr instance, and is left out when Tracearr holds no id for it.

An item with more than 5000 plays answers `502` instead of a partial total, since a truncated number would read as a fact.
