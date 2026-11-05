---
slug: /api/ombi
title: Ombi API
description: The Ombi requester lookup used by the media modal and the pre-deletion warning.
---

One read-only route that names who requested a title in [Ombi](https://ombi.io/). Ombi request _deletion_ has no route of its own: it happens inside collection handling when a collection has `Force delete Ombi request` on.

Ombi is a separate integration from [Seerr](./seerr.md), with its own settings and its own rule properties. Both can be configured at once, and the media modal and the pre-deletion warning merge the names they return.

See [API conventions](../API.md#api-conventions) for the rules that apply to every endpoint.

## Endpoints

### `GET /api/ombi/requests/{tmdbId}/users`

**List the deduplicated Ombi usernames of everyone who requested a title, optionally narrowed to one season or episode.**

| Parameter | Type           | Required | Description                                                                                         |
| --------- | -------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `tmdbId`  | path, integer  | Yes      | TMDB id of the movie or show. Ombi keys movies by TMDB id and shows by the TMDB id it holds on them |
| `type`    | query, string  | Yes      | `movie` or `tv`. Anything else is a `400`                                                           |
| `season`  | query, integer | No       | Season number. Only narrows a `tv` lookup                                                           |
| `episode` | query, integer | No       | Episode number within `season`. Only narrows a `tv` lookup                                          |

Response:

```json
["example-user", "another-user"]
```

| Status | Cause                                                                                     |
| ------ | ----------------------------------------------------------------------------------------- |
| `200`  | Array of usernames, possibly empty                                                        |
| `400`  | `tmdbId` is not an integer, `type` is missing or not `movie`/`tv`, or a number is not one |

`type` is required and validated, as on the Seerr route, because Ombi keeps movie and show requests in separate lists and cannot be asked for both at once.

A request made with Ombi's API key is recorded against Ombi's system user, so the name reported is the alias that request carries instead.

An empty array conflates three states: nobody requested the title, Ombi is down, and Ombi is not configured. This is deliberate, so that a pre-deletion notification is never suppressed just because the requester could not be named.

:::caution Cost trap
The first call after the cache is cleared reads **every** movie request and **every** show request in Ombi to build an index. Opening a media modal can therefore trigger a full request prefetch. Concurrent first callers are collapsed onto a single sweep, and a failed sweep is not cached so the next call retries. The index is held for an hour and is cleared at the start of every rule group run.
:::
