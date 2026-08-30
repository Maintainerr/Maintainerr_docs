---
slug: /api/media-server
title: Media Server API
description: Libraries, items, search, watch state, users, and collections on Plex, Jellyfin or Emby.
---

Direct access to the configured media server: Plex, Jellyfin or Emby. Maintainerr talks to all three through one adapter layer, so these routes have a single shape, but behaviour differs by backend more than anywhere else in the API. Those differences are called out per endpoint.

See [API conventions](../API.md#api-conventions) for the rules that apply across the API.

## Common responses

Every route on this page is behind the media server setup check, which is the only guard in Maintainerr. It confirms that a media server is configured, **not** who is calling. These four outcomes apply to every endpoint here, so the per-endpoint tables below list only the route-specific codes.

| Status | Cause                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| `403`  | No media server type is set, or the selected type's credentials are incomplete. Body is `Forbidden resource`              |
| `503`  | A media server switch is in progress, the credentials are not saved yet, or the adapter failed to start                   |
| `500`  | The settings row could not be read, or no media server type is set in the database even though the in-memory check passed |
| `500`  | Jellyfin only: the adapter had not started yet and starting it threw                                                      |

:::note Absent and unreachable often look the same
Many read routes answer `200` with an empty body or an empty array for both "it is not there" and "the server could not be read". Where a route does that it is stated below. Where a route fails closed with a `500` instead, that is deliberate: a fabricated empty result would read as "the library is empty" and could let a rule remove media it never evaluated.
:::

## Server status

### `GET /api/media-server`

**Report the configured media server's identity and version, or nothing when it is unreachable.**

Response:

```json
{
  "machineId": "abc123",
  "version": "1.40.0",
  "name": "My server",
  "platform": "Linux",
  "url": "http://jellyfin.example.com"
}
```

Plex fills only `machineId` and `version`. Jellyfin and Emby also fill `name`, `platform` and `url`.

| Status | Cause                                                                               |
| ------ | ----------------------------------------------------------------------------------- |
| `200`  | Status returned, **or an empty body when the server is configured but unreachable** |

An empty body means the server is down, not that no server is configured. That case is the `403`.

Successful status reads are cached for 60 seconds on Jellyfin and Emby. A server that just came back is visible immediately, but one that just went down can still report fine for up to a minute.

### `GET /api/media-server/type`

**Return which media server backend is currently active.**

Response:

```json
{ "type": "plex" }
```

`type` is `plex`, `jellyfin` or `emby`.

| Status | Cause                       |
| ------ | --------------------------- |
| `200`  | The configured backend name |

A `200` proves the credentials are configured and the adapter completed a handshake at least once. It is **not** a live reachability check. An adapter that started successfully stays marked as ready, so a server that has since gone down still answers here. Use `GET /api/media-server` for reachability.

## Libraries

### `GET /api/media-server/libraries`

**List the movie and show libraries on the configured media server.**

Response:

```json
[
  {
    "id": "1",
    "title": "Movies",
    "type": "movie",
    "agent": "tv.plex.agents.movie"
  }
]
```

`agent` is only set on Plex. Libraries of other kinds, such as music or photos, are dropped on all three backends.

| Status | Cause                                                                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200`  | The library list, possibly `[]` when the server is reachable and genuinely has no movie or show libraries                                             |
| `503`  | The list came back empty **and** the server could not be reached, reported as `Media server is configured but unreachable. Library list unavailable.` |

Telling "empty" apart from "unreachable" is the whole point of this route, so do not read `[]` as a failure.

The list is cached for 30 minutes on Jellyfin and Emby, so a newly added library can take that long to appear.

### `GET /api/media-server/library/{id}/content`

**Page through a library's items, sorted and annotated with Maintainerr exclusion and collection state.**

| Parameter   | Type           | Required | Description                                                                                         |
| ----------- | -------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `id`        | path           | Yes      | Library id. A Plex section key, or a Jellyfin or Emby folder id                                     |
| `page`      | query, integer | No       | 1-based page number, default `1`. Values below 1 are clamped to 1                                   |
| `limit`     | query, integer | No       | Items per page, default `50`. **No upper cap**                                                      |
| `type`      | query          | No       | `movie`, `show`, `season` or `episode`. Not validated: an unrecognised value silently means `movie` |
| `sort`      | query          | No       | `title`, `airDate`, `rating`, `watchCount`, `studio`, `manual` or `excluded`                        |
| `sortOrder` | query          | No       | `asc` or `desc`. Defaults to ascending                                                              |

Response:

```json
{
  "items": [
    {
      "id": "12345",
      "title": "An example title",
      "guid": "plex://movie/abc",
      "type": "movie",
      "addedAt": "2026-01-01T00:00:00.000Z",
      "providerIds": { "tmdb": ["550"] },
      "mediaSources": [{ "id": "1", "sizeBytes": 0 }],
      "library": { "id": "1", "title": "Movies" },
      "maintainerrExclusionType": "global",
      "maintainerrIsManual": true,
      "maintainerrCollections": ["Example collection"]
    }
  ],
  "totalSize": 1,
  "offset": 0,
  "limit": 50
}
```

Items carry the full media item shape. On top of the media server's own fields, this route adds Maintainerr state: `maintainerrExclusionId`, `maintainerrExclusionType` which is `specific` or `global`, `maintainerrIsManual`, and `maintainerrCollections`, the titles of every collection the item belongs to.

| Status | Cause                                                                                       |
| ------ | ------------------------------------------------------------------------------------------- |
| `200`  | The page                                                                                    |
| `400`  | `page` or `limit` is not an integer, or `sort` or `sortOrder` is outside its allowed values |
| `400`  | `Studio sorting is not supported by the configured media server.`                           |
| `500`  | The page read failed, or the Maintainerr state lookup failed                                |

This route fails closed. A failed page read is a `500`, never an empty page.

:::caution The status sorts walk the whole library
`sort=manual` and `sort=excluded` are Maintainerr state, not something the media server can sort by. Choosing either makes the server walk the **entire library** in batches, annotate every item, sort the whole set, and only then return your page.

It stops after 15000 items. Past that the results are silently partial and `totalSize` reports how many items were gathered rather than the library total. Avoid these sorts on large libraries.
:::

Note that `limit` has no cap and is passed straight through. A `limit` of `0` reaches the backend, where Plex and Emby honour it while Jellyfin substitutes its own default of 100.

### `GET /api/media-server/library/{id}/content/search/{query}`

**Search one library by title and return enriched results with parent metadata attached.**

| Parameter | Type  | Required | Description                                                                                         |
| --------- | ----- | -------- | --------------------------------------------------------------------------------------------------- |
| `id`      | path  | Yes      | Library id to search inside                                                                         |
| `query`   | path  | Yes      | Search text. Taken raw from the path, so a query containing `/` will not route                      |
| `type`    | query | No       | `movie`, `show`, `season` or `episode`. Not validated: an unrecognised value silently means `movie` |

Returns an array of media items with the same Maintainerr enrichment as the content route. Season and episode results also carry `parentItem`, the parent or grandparent's metadata.

| Status | Cause                                                                 |
| ------ | --------------------------------------------------------------------- |
| `200`  | Matching items, **or `[]` when nothing matched or the search failed** |
| `500`  | The Maintainerr state lookup failed                                   |

Unlike the paged content route, this one fails open. An empty array does not prove there were no matches.

Search behaviour differs by backend. Plex matches on title as a prefix filter, while Jellyfin and Emby do a fuzzier search. Emby caps results at 100; Plex and Jellyfin apply no explicit cap here.

### `GET /api/media-server/library/{id}/recent`

**List recently added items from a library.**

| Parameter | Type           | Required | Description                                                                          |
| --------- | -------------- | -------- | ------------------------------------------------------------------------------------ |
| `id`      | path           | Yes      | Library id                                                                           |
| `limit`   | query, integer | No       | Maximum items. There is no default from Maintainerr, so each backend applies its own |

Returns raw media items with no Maintainerr enrichment.

| Status | Cause                             |
| ------ | --------------------------------- |
| `200`  | The items, **or `[]` on failure** |
| `400`  | `limit` is not an integer         |

:::caution Behaviour differs sharply by backend
Plex interprets "recent" as **everything added in the last hour** and is never told your `limit`, so an idle server returns `[]` no matter what you pass. Jellyfin defaults to 50 items and Emby to 20.

Emby needs a configured user id or it returns `[]` without contacting the server at all, and its results group episodes under their series, so asking for episodes gives you series rows.
:::

### `GET /api/media-server/overview/bootstrap`

**Fetch the library list plus the first library's first content page in one request.**

A convenience route for the Overview page, so it can render in one round trip.

| Parameter   | Type           | Required | Description                                           |
| ----------- | -------------- | -------- | ----------------------------------------------------- |
| `limit`     | query, integer | No       | Page size for the embedded content page, default `50` |
| `sort`      | query          | No       | Same values as the content route                      |
| `sortOrder` | query          | No       | `asc` or `desc`                                       |

Response:

```json
{
  "libraries": [{ "id": "1", "title": "Movies", "type": "movie" }],
  "selectedLibraryId": "1",
  "content": { "items": [], "totalSize": 0, "offset": 0, "limit": 50 }
}
```

| Status | Cause                                                                             |
| ------ | --------------------------------------------------------------------------------- |
| `200`  | Libraries plus the first page                                                     |
| `400`  | `limit` is not an integer, or `sort` or `sortOrder` is outside its allowed values |
| `500`  | The page read failed, or the Maintainerr state lookup failed                      |
| `503`  | The library list is unavailable because the server could not be reached           |

There is no way to choose which library is bootstrapped. It is always the first one the media server returned. The embedded page is always filtered to that library's own type, so a show library returns shows and never seasons or episodes.

A `sort` of `manual` or `excluded` pays the full-library sweep described above, at page load.

### `GET /api/media-server/search/{query}`

**Search the whole media server and return enriched results with parent metadata attached.**

| Parameter | Type | Required | Description                                                                    |
| --------- | ---- | -------- | ------------------------------------------------------------------------------ |
| `query`   | path | Yes      | Search text. Taken raw from the path, so a query containing `/` will not route |

| Status | Cause                                                          |
| ------ | -------------------------------------------------------------- |
| `200`  | Matches, **or `[]` when nothing matched or the search failed** |
| `500`  | The Maintainerr state lookup failed                            |

Result kinds differ by backend. Plex filters to movies and shows, so episodes never appear. Jellyfin and Emby return episodes as their own rows, each carrying a `parentItem`. Result caps are 50 on Jellyfin and 100 on Emby.

## Items

### `GET /api/media-server/meta/{id}`

**Fetch full metadata for a single media item.**

| Parameter | Type | Required | Description                                               |
| --------- | ---- | -------- | --------------------------------------------------------- |
| `id`      | path | Yes      | Item id. A Plex rating key, or a Jellyfin or Emby item id |

| Status | Cause                                                                        |
| ------ | ---------------------------------------------------------------------------- |
| `200`  | The item, **or an empty body for both "no such item" and "the read failed"** |

There is no way to tell a missing item from a failed read here.

:::caution Watch fields are per-user and cached
`viewCount`, `lastViewedAt` and `userRating` are scoped to the single Jellyfin or Emby user Maintainerr is configured with, and are cached for 5 minutes. Do not use them to drive watch or deletion decisions. Use `GET /api/media-server/meta/{id}/seen` for that.
:::

### `GET /api/media-server/meta/{id}/children`

**List an item's direct children, meaning a show's seasons or a season's episodes.**

| Parameter | Type | Required | Description                        |
| --------- | ---- | -------- | ---------------------------------- |
| `id`      | path | Yes      | Parent item id, a show or a season |

| Status | Cause                                                               |
| ------ | ------------------------------------------------------------------- |
| `200`  | The children, **or `[]` when the item has none or the read failed** |

:::caution Unreliable for a show's seasons on Jellyfin and Emby
On Plex the hierarchy is unambiguous and this works for both shows and seasons.

On Jellyfin and Emby it asks for items whose parent is the id you gave. A season's parent there is the **library folder**, not the show, so asking a series for its seasons does not reliably return them. Maintainerr uses a dedicated seasons lookup internally for that, and this route does not reach it.
:::

Unaired placeholder episodes are not filtered out on this route. Emby caps the read at 500 rows.

### `GET /api/media-server/meta/{id}/seen`

**List completed watch records for one item, aggregated across users.**

Response:

```json
[
  {
    "userId": "1",
    "itemId": "12345",
    "watchedAt": "2026-01-01T00:00:00.000Z",
    "progress": 100
  }
]
```

| Status | Cause                                                 |
| ------ | ----------------------------------------------------- |
| `200`  | The records, or `[]` when nobody has watched the item |
| `500`  | The read failed                                       |

This route fails closed on purpose. Returning `[]` on failure would look like "never watched", which feeds rule checks and can get media deleted.

That protection is not uniform. On Jellyfin the per-user reads are individually tolerant, so one user's read failing silently reads as "that user never watched it". Emby is stricter: a per-user permission or not-found response is skipped as a visibility miss, but any other per-user error aborts the whole request.

What counts as "completed" is server-defined. Jellyfin honours its resume percentage setting, so a partly watched item can count. Emby only counts items explicitly marked played. Plex writes no history for an item marked watched without a play event, such as a manual mark or a Trakt scrobble, so those views never appear here.

On Jellyfin and Emby this fans out per user, so cost grows with your user count.

### `GET /api/media-server/meta/{id}/maintainerr-status`

**Explain why an item is excluded from, or manually added to, Maintainerr collections.**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `id`      | path | Yes      | Item id     |

Response:

```json
{
  "excludedFrom": [
    { "label": "Global" },
    { "label": "Example collection", "targetPath": "/collections/1/exclusions" }
  ],
  "manuallyAddedTo": [
    { "label": "Example collection (5d left)", "targetPath": "/collections/1" }
  ]
}
```

A `Global` entry with no `targetPath` means a global exclusion. Other entries name a rule group's collection and link to it. The `(5d left)` suffix is the remaining countdown, computed at request time from the item's add date and the collection's delete-after days, so it changes between calls.

| Status | Cause                                                                          |
| ------ | ------------------------------------------------------------------------------ |
| `200`  | The details, including two empty arrays when the item has no Maintainerr state |
| `500`  | A database read failed                                                         |

Exclusion matching is two-sided, which is how an episode inherits its show's exclusion.

:::caution Fails soft in a way that changes the answer
If the media server cannot resolve the item, the lookup falls back to the item id alone. A show-level or season-level exclusion then silently disappears from the response and you get an empty `excludedFrom` rather than an error.
:::

## Users

### `GET /api/media-server/users`

**List the media server's user accounts.**

Response:

```json
[{ "id": "1", "name": "example-user", "thumb": "/Users/1/Images/Primary" }]
```

On Jellyfin and Emby `thumb` is a relative path, not an absolute URL, and is only set when the user has an image.

| Status | Cause                                           |
| ------ | ----------------------------------------------- |
| `200`  | The user list, **or `[]` when the read failed** |

On Plex this is the server's own account list, meaning the owner plus managed and home users. It is not your Plex friends list.

The list is cached for 30 minutes on Jellyfin and Emby, so a newly created user is invisible here for up to half an hour.

### `GET /api/media-server/user/{id}`

**Look up one media server user by id.**

| Parameter | Type | Required | Description                                                                                  |
| --------- | ---- | -------- | -------------------------------------------------------------------------------------------- |
| `id`      | path | Yes      | User id. On Plex this must be the numeric account id. On Jellyfin and Emby it is the user id |

| Status | Cause                                                                   |
| ------ | ----------------------------------------------------------------------- |
| `200`  | The user, **or an empty body for both "not found" and "lookup failed"** |

There is no `404`, so this cannot be used to prove a user is gone.

## Collections on the media server

These routes act on collections as the media server stores them. They do **not** touch Maintainerr's own collection records, which live under [`/api/collections`](./collections.md). Using them on a collection Maintainerr manages will make the two disagree.

Nothing in the Maintainerr web UI calls any of these routes.

### `GET /api/media-server/collection/{id}`

**Read one collection's metadata from the media server.**

| Parameter | Type | Required | Description                       |
| --------- | ---- | -------- | --------------------------------- |
| `id`      | path | Yes      | Collection id on the media server |

Response:

```json
{
  "id": "999",
  "title": "Example collection",
  "type": "movie",
  "summary": "",
  "thumb": "/library/collections/999/thumb",
  "childCount": 12,
  "smart": false
}
```

`type` is only ever set on Plex. `smart` is always `false` on Jellyfin and Emby. `thumb` is a relative path, never an absolute URL.

| Status | Cause                                                                      |
| ------ | -------------------------------------------------------------------------- |
| `200`  | The collection, **or an empty body when it is missing or the read failed** |

On Emby the read has to be made as a user. If no administrator can be resolved, the route returns an empty body without contacting the server at all.

### `GET /api/media-server/collection/{id}/children`

**List the items a collection contains.**

| Parameter | Type | Required | Description                       |
| --------- | ---- | -------- | --------------------------------- |
| `id`      | path | Yes      | Collection id on the media server |

| Status | Cause                                                                              |
| ------ | ---------------------------------------------------------------------------------- |
| `200`  | The items, possibly `[]`, which means the server confirmed the collection is empty |
| `500`  | Enumeration failed, including an unknown collection id on Plex                     |

This fails closed everywhere, because callers treat `[]` as "confirmed empty" and would otherwise wipe membership.

There is no paging: the whole collection is returned in one response. Items are **not** Maintainerr-enriched here, so the `maintainerr*` fields are absent.

On Jellyfin and Emby nothing checks that the id is actually a collection, so pointing this at another container id enumerates that container instead of failing.

### `GET /api/media-server/library/{id}/collections`

**List the collections in a library.**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `id`      | path | Yes      | Library id  |

| Status | Cause                                                                                                           |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| `200`  | The collections, possibly `[]`, which means the library genuinely holds none                                    |
| `500`  | Enumeration failed. An unknown library id usually lands here on Plex and as an empty `200` on Jellyfin and Emby |

:::caution Always served from cache
This route always reads through the cache and cannot be told not to. A collection created seconds ago can be missing for up to 5 minutes on Plex, or 10 minutes on Jellyfin and Emby. Do not use it to decide whether a collection exists.
:::

On Plex the listing includes smart collections. On Jellyfin and Emby collections are server-wide and are only associated with the library they were created under, so one holding items from several libraries appears under just that one.

### `POST /api/media-server/collection`

**Create a collection on the media server.**

Request body:

```json
{
  "libraryId": "1",
  "title": "Example collection",
  "type": "movie",
  "summary": "Optional summary",
  "sortTitle": "Optional sort title",
  "initialItemId": "12345"
}
```

| Field           | Type   | Required | Description                                                        |
| --------------- | ------ | -------- | ------------------------------------------------------------------ |
| `libraryId`     | string | Yes      | Library to create it in                                            |
| `title`         | string | Yes      | Collection title                                                   |
| `type`          | string | Yes      | `movie`, `show`, `season` or `episode`                             |
| `summary`       | string | No       | Description                                                        |
| `sortTitle`     | string | No       | Sort title                                                         |
| `initialItemId` | string | No       | A single item to create the collection with. **Read only by Emby** |

The body is not validated, so a missing `libraryId` or `title` reaches the media server as an empty value.

| Status | Cause                                                             |
| ------ | ----------------------------------------------------------------- |
| `201`  | Created. The body is the new collection                           |
| `500`  | The media server rejected the create or the follow-up read failed |

Nothing is written to Maintainerr's database, so a collection made this way is invisible to Maintainerr's own bookkeeping. Nothing deduplicates by title either, so repeated calls create duplicates.

:::caution Backend differences are large here
On **Plex** the type is fixed at creation and Plex then rejects items of any other type.

On **Jellyfin** `type`, `summary`, `sortTitle` and `initialItemId` are all ignored by the create call, yet the response echoes back the `summary` you sent. You can be told a summary was stored that Jellyfin never received.

On **Emby** creating an empty collection under a library folder fails, which is exactly what `initialItemId` exists for. Omit it on Emby and the create is expected to fail.
:::

### `PUT /api/media-server/collection`

**Overwrite a collection's title, summary and sort title on the media server.**

Request body:

```json
{
  "libraryId": "1",
  "collectionId": "999",
  "title": "New title",
  "summary": "New summary",
  "sortTitle": "New sort title"
}
```

`libraryId` and `collectionId` are required. The rest are optional.

| Status | Cause                                                       |
| ------ | ----------------------------------------------------------- |
| `200`  | Updated. The body is the collection re-read from the server |
| `500`  | The write failed, or the collection was not found           |

:::warning Destructive
Overwrites collection metadata on the media server. The previous title, summary and sort title are not kept anywhere, so **this cannot be undone** except by writing the old values back yourself.

Maintainerr's own collection record is not updated, so renaming here makes Maintainerr's idea of the collection drift from the server's. Maintainerr rewrites its own values back over yours when its collection record is next saved or the collection is recreated.
:::

:::caution A partial update is not safe on Jellyfin
Emby keeps the current value for any field you omit. **Jellyfin does not**: an omitted field is written as empty, wiping it.

On Plex, sending `title` on its own also resets the sort title to match and unlocks it.
:::

### `PUT /api/media-server/collection/visibility`

**Set a Plex collection's home screen and recommended hub visibility.**

Request body:

```json
{
  "libraryId": "1",
  "collectionId": "999",
  "ownHome": true,
  "sharedHome": true,
  "recommended": true
}
```

`libraryId` and `collectionId` are required, plus at least one of the three flags.

| Status | Cause                                                                                  |
| ------ | -------------------------------------------------------------------------------------- |
| `200`  | Applied. The body is empty                                                             |
| `400`  | `libraryId` or `collectionId` is missing, or all three flags were omitted              |
| `500`  | Plex rejected the write, or the backend is Jellyfin or Emby, which do not support this |

:::warning Destructive
This is a full overwrite, not a partial update. All three flags are sent every time, and **any flag you omit is set to `false`**.

Sending only `recommended: true` therefore silently clears `ownHome` and `sharedHome`. The validation only requires one flag to be present, which makes this easy to hit. Send all three flags every time.

Maintainerr's own visibility columns are not updated, so calling this directly makes the UI disagree with the server until Maintainerr next writes its own values back.
:::

This is Plex only. Jellyfin and Emby have no equivalent and report a `500` rather than a clearer error.

### `PUT /api/media-server/collection/{collectionId}/item/{itemId}`

**Add one item to a collection on the media server.**

| Parameter      | Type | Required | Description          |
| -------------- | ---- | -------- | -------------------- |
| `collectionId` | path | Yes      | Target collection id |
| `itemId`       | path | Yes      | Item id to add       |

| Status | Cause                                                                      |
| ------ | -------------------------------------------------------------------------- |
| `200`  | The change was attempted. The body is empty                                |
| `500`  | Plex or Jellyfin rejected the write. **Emby never reports a failure here** |

Membership is a set, so re-adding an existing member does nothing.

On Emby, failures are logged and swallowed, so a `200` does not prove the item was added.

On Jellyfin and Emby collections are server-wide, so an item from any library can be added. On Plex both must be in the same library section, and adding an item whose type does not match the collection is rejected.

:::caution This changes what Maintainerr does next
On the next rule run for a linked collection, an item you added here that Maintainerr does not know about is **adopted as a manual member** rather than removed. It then becomes subject to that collection's delete-after countdown.
:::

### `DELETE /api/media-server/collection/{collectionId}/item/{itemId}`

**Remove one item from a collection on the media server.**

| Parameter      | Type | Required | Description       |
| -------------- | ---- | -------- | ----------------- |
| `collectionId` | path | Yes      | Collection id     |
| `itemId`       | path | Yes      | Item id to remove |

| Status | Cause                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `200`  | The change was attempted. The body is empty                                                                                                |
| `500`  | Plex or Jellyfin rejected the removal. On Plex even "the item was not in the collection" is a `500`. **Emby never reports a failure here** |

:::warning Destructive
Removes the item from the collection on the media server. **No media files are deleted** and nothing is removed from your library. Re-add it with the `PUT` route above.

Maintainerr's own membership records are not updated by this route. On the next rule run for a linked collection the item is detected as missing and dropped from Maintainerr's membership as a manual removal.
:::

Caches are not invalidated on Plex or Emby, so `GET /api/media-server/collection/{id}/children` can still list the removed item for a few minutes.

### `DELETE /api/media-server/collection/{id}`

**Delete a collection from the media server.**

| Parameter | Type | Required | Description                       |
| --------- | ---- | -------- | --------------------------------- |
| `id`      | path | Yes      | Collection id on the media server |

| Status | Cause                                                                                     |
| ------ | ----------------------------------------------------------------------------------------- |
| `200`  | Deleted, or on Plex and Jellyfin the collection was already gone                          |
| `500`  | The delete failed, or the collection still exists, or its existence could not be verified |

:::warning Destructive
Permanently removes the collection on the media server. **This cannot be undone.**

It removes the container only. The media inside it is not deleted and stays in your library.

If a Maintainerr rule group points at this collection, Maintainerr's own record and its membership rows are left behind pointing at something that no longer exists. The stale link is only cleared later, once Maintainerr confirms the collection is missing.
:::

Plex and Jellyfin treat "already gone" as success, but only when they can confirm it. An unreachable server is deliberately treated as "still there" so an outage never reads as a successful delete. Emby has no such check and reports a `500`.
