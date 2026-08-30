---
slug: /api/seerr
title: Seerr API
description: Seerr lookups, requester names, and request and media deletion.
---

Proxies to the configured Seerr instance, plus three routes that delete things there.

:::info Alias paths
Every route on this page answers on three prefixes: `/api/seerr`, `/api/overseerr` and `/api/jellyseerr`. They are pure aliases of the same handler, kept for backward compatibility. The `/api/seerr` form is canonical and is the one used below.
:::

These routes talk to Seerr only. They behave identically whether Maintainerr is wired to Plex, Jellyfin or Emby.

See [API conventions](../API.md#api-conventions) for the rules that apply across the API.

:::note Failures look like success
Nothing on this page returns a `4xx` or `5xx` for an upstream problem. An unreachable Seerr, a bad API key, an unknown id, and Seerr not being configured at all collapse into either an empty `200` body or an empty array. Plan for that: you cannot tell those cases apart from the response.
:::

Responses are cached in memory for 20 minutes. The deleting routes do **not** invalidate that cache, so a read straight after a delete can still show the deleted record.

## Lookups

### `GET /api/seerr/movie/{id}`

**Fetch a movie's record from the configured Seerr instance by TMDB id.**

A pass-through proxy. Seerr's own movie JSON is forwarded unchanged, with no reshaping and no field stripping.

| Parameter | Type   | Required | Description                                                 |
| --------- | ------ | -------- | ----------------------------------------------------------- |
| `id`      | string | Yes      | TMDB movie id, not Seerr's internal media id. Not validated |

Maintainerr reads only part of the payload: `id`, `releaseDate` and `mediaInfo`. Within `mediaInfo` it uses `id`, which is Seerr's internal media-row id, along with `tmdbId`, `tvdbId`, `status` and `requests`. Each request carries `id`, `status`, `createdAt`, `updatedAt`, `requestedBy` and `modifiedBy`. Request `status` is `1` pending, `2` approved, `3` declined, `4` failed, `5` completed.

A movie Seerr does not track still returns a body, with `mediaInfo` absent or null.

| Status                   | Cause                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `200`                    | Seerr's JSON body                                                                                   |
| `200` with an empty body | Unknown id, Seerr returned an error, Seerr was unreachable or timed out, or Seerr is not configured |

### `GET /api/seerr/show/{id}`

**Fetch a show's record from the configured Seerr instance by TMDB id.**

The same pass-through proxy for shows. Note the naming mismatch: this route is `show`, while the Seerr endpoint behind it is `tv`.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `id`      | string | Yes      | TMDB show id, not Seerr's internal media id. Not validated |

On top of the movie fields, `mediaInfo` carries `seasons`, and each request carries a `seasons` array of `id`, `name`, `seasonNumber` and `status`. A show Seerr does not track returns a body with `mediaInfo` null.

| Status                   | Cause                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `200`                    | Seerr's JSON body                                                                                   |
| `200` with an empty body | Unknown id, Seerr returned an error, Seerr was unreachable or timed out, or Seerr is not configured |

There is no route for fetching a single season.

### `GET /api/seerr/requests/{tmdbId}/users`

**List the deduplicated usernames of everyone who requested a title, optionally narrowed to one season.**

This is the route behind the "Requested by" line in the media modal. Names are resolved as the Plex username, then the Jellyfin username, then the plain Seerr username.

| Parameter | Type           | Required | Description                                                              |
| --------- | -------------- | -------- | ------------------------------------------------------------------------ |
| `tmdbId`  | path, integer  | Yes      | TMDB id of the movie or show                                             |
| `season`  | query, integer | No       | Season number. Only filters show requests, so it is harmless for a movie |

Response:

```json
["example-user", "another-user"]
```

Order is oldest request first.

| Status | Cause                                                                 |
| ------ | --------------------------------------------------------------------- |
| `200`  | Array of usernames, possibly empty                                    |
| `400`  | `tmdbId` is not an integer, or `season` is present but not an integer |

Pass `season` for a season-level lookup. Seerr tracks show requests per season, so without it a season lookup credits whoever requested a _different_ season.

Watch the empty-value case: `?season=` with nothing after it is not the same as omitting the parameter. It fails validation and returns `400`. Omit the parameter entirely instead.

An empty array conflates three states: nobody requested the title, Seerr is down, and Seerr is not configured. This is deliberate, so that a pre-deletion notification is never suppressed just because the requester could not be named.

:::caution Cost trap
The first call after the cache is cleared sweeps **every** request in Seerr, 100 at a time, to build an index. Opening a media modal can therefore trigger a full request prefetch. Concurrent first callers are collapsed onto a single sweep, and a failed sweep is not cached so the next call retries. The index is held for an hour and is cleared at the start of every rule group run.
:::

## Deletion

The three routes below change data on your Seerr instance. None of them require authentication, and none of them ask for confirmation.

### `DELETE /api/seerr/request/{requestId}`

**Delete a single request on the configured Seerr instance.**

| Parameter   | Type   | Required | Description                                                                                                   |
| ----------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------- |
| `requestId` | string | Yes      | Seerr's own request id, taken from `mediaInfo.requests[].id`. Not a TMDB id and not a media id. Not validated |

| Status                   | Cause                            |
| ------------------------ | -------------------------------- |
| `200` with an empty body | Always. The delete was attempted |

:::warning Destructive
Deletes the named request on your Seerr instance. **This cannot be undone from Maintainerr**, and the request can only be restored by making it again in Seerr.

It does not remove the media record, delete any file, or touch your media server or `*arr` instances. Seerr keeps the media row until it is deleted separately.
:::

Success and failure are indistinguishable. Seerr answers these deletes with an empty `204`, and every error is swallowed, so you always get the same empty `200`. Check Seerr itself to confirm.

### `DELETE /api/seerr/media/{mediaId}`

**Delete a media record on the configured Seerr instance by Seerr's internal media id.**

| Parameter | Type   | Required | Description                                                                                                                  |
| --------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `mediaId` | string | Yes      | Seerr's internal media-row id, which is the `mediaInfo.id` field of a movie or show lookup. **Not a TMDB id.** Not validated |

| Status                   | Cause                            |
| ------------------------ | -------------------------------- |
| `200` with an empty body | Always. The delete was attempted |

:::warning Destructive
Deletes the media record on your Seerr instance, **which takes all of that title's requests with it**. This cannot be undone from Maintainerr.

No file is deleted, and nothing changes in Maintainerr's database, on your media server, or in any `*arr` instance.
:::

:::danger Wrong ids fail silently
Seerr answers `204` for an id it does not hold, so passing a TMDB id here, or an id that was already deleted, is a silent no-op that looks exactly like a successful deletion.

If all you have is a TMDB id, use `DELETE /api/seerr/media/tmdb/{mediaId}` instead, which does the lookup for you and reports whether anything was deleted.
:::

There is one route-matching quirk worth knowing: a bare `DELETE /api/seerr/media/tmdb` with no id after it lands on **this** handler with `mediaId` set to the literal string `tmdb`, and that is sent to Seerr as-is.

### `DELETE /api/seerr/media/tmdb/{mediaId}`

**Look a movie up in Seerr by TMDB id and delete its media record.**

Resolves the title through Seerr's movie lookup and then deletes the media record it points at. Unlike the other two deletion routes, this one reports what happened.

| Parameter | Type   | Required | Description                                                               |
| --------- | ------ | -------- | ------------------------------------------------------------------------- |
| `mediaId` | string | Yes      | TMDB id of a **movie**, despite the generic parameter name. Not validated |

The body is the bare text `true` or `false`, not JSON.

| Status                   | Cause                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `200` with body `true`   | Seerr had a media record for that movie and it was deleted                                              |
| `200` with body `false`  | Seerr answered, but the movie has no media record, so there was nothing to delete                       |
| `200` with an empty body | The state could not be established: unknown id, Seerr unreachable, bad API key, or Seerr not configured |

:::warning Destructive
Deletes the resolved media record on your Seerr instance, taking that title's requests with it. This cannot be undone from Maintainerr.

No file is deleted and nothing changes on your media server or in any `*arr` instance.
:::

:::danger Movies only
This route hardcodes the movie type, so a TMDB id is always looked up as a movie.

TMDB numbers movies and shows independently. Passing a **show's** TMDB id here does not fail. It resolves to whatever unrelated movie happens to carry that id, and deletes that movie's Seerr record instead. There is no route for the show variant.
:::
