---
slug: /api/collections
title: Collections API
description: Maintainerr collections, membership, bulk media actions, handling, posters and logs.
---

Maintainerr's own collections: the rows it keeps in its database, the membership it tracks, and the actions it runs against that membership. See the [Collections](../Collections.md) page for what the feature does.

These are not the same thing as collections on your media server. Those live under [`/api/media-server`](./media-server.md). A Maintainerr collection usually has a linked media server collection, and Maintainerr reconciles the two, but the records are separate.

See [API conventions](../API.md#api-conventions) for the rules that apply across the API.

## Four words that mean very different things

This is the single easiest thing to get wrong on this page.

| Term                  | What it does                                                        | Deletes media files?                      |
| --------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| **Remove**            | Ends an item's membership of a collection                           | No                                        |
| **Handle**            | Runs the collection's configured action on an item, then removes it | **Yes**, if the action is a delete action |
| **Deactivate**        | Tears down the media server collection and **wipes all membership** | No                                        |
| **Remove collection** | Deletes the Maintainerr collection **and its rule group**           | No                                        |

Only **handle** touches media files. Everything else is membership and bookkeeping.

## The deletion timer

Every membership row carries an `addDate`, set to the day the item was added. The collection handler acts on an item once `addDate` is at least `deleteAfterDays` in the past.

:::danger A null deleteAfterDays means "due immediately"
The handler reads a missing `deleteAfterDays` as `0`, so **every member of such a collection is due right now**. If that collection's action is a delete action, the next run deletes those files.

Note this disagrees with the UI, which shows no leaving date at all for the same value. Set `deleteAfterDays` explicitly on any collection whose action deletes.
:::

Adding an item starts its timer from that day. Removing and re-adding it restarts the timer from scratch.

## Reading collections

### `GET /api/collections`

**List Maintainerr collections with a two-item media preview and a true member count.**

| Parameter   | Type  | Required | Description                                                                                  |
| ----------- | ----- | -------- | -------------------------------------------------------------------------------------------- |
| `libraryId` | query | No       | Media server library id to filter on. Not validated                                          |
| `typeId`    | query | No       | `movie`, `show`, `season` or `episode`. Not validated: an unrecognised value matches nothing |

The two filters are combined with AND.

Each row is the full collection record plus two extra keys: `media`, holding at most **two** preview rows, and `mediaCount`, the real member count.

| Status                   | Cause                                                                  |
| ------------------------ | ---------------------------------------------------------------------- |
| `200`                    | The list                                                               |
| `200` with an empty body | The read threw, or artwork enrichment could not reach the media server |

:::caution The whole list can vanish with a 200
Preview rows that have no artwork are enriched on the fly, and that step needs a working media server. If no media server is configured, or a switch is in progress, the **entire response** comes back as an empty `200`.

Clients must handle a non-array response. Use [`GET /api/collections/overlay-data`](#get-apicollectionsoverlay-data) if you want a list that never contacts the media server.
:::

`media` is a preview, not membership. Use `mediaCount` for the size and the paged content route for the members.

Size fields are stored as big integers and may arrive as numeric strings rather than numbers. Do not assume the JSON type.

### `GET /api/collections/collection/{id}`

**Fetch one collection's settings row by database id.**

| Parameter | Type    | Required | Description               |
| --------- | ------- | -------- | ------------------------- |
| `id`      | integer | Yes      | Maintainerr collection id |

| Status                   | Cause                                     |
| ------------------------ | ----------------------------------------- |
| `200`                    | The row                                   |
| `200` with an empty body | The id does not exist, or the query threw |
| `400`                    | `id` is not an integer                    |

There is no `404`, so check for an empty body. This route never populates a `media` array, so do not read membership from it.

### `GET /api/collections/overlay-data`

**List collections with their complete media membership.**

Same filters as `GET /api/collections`, but instead of a two-item preview every membership row is attached, with `mediaCount` equal to the real length.

| Parameter   | Type  | Required | Description                            |
| ----------- | ----- | -------- | -------------------------------------- |
| `libraryId` | query | No       | Media server library id to filter on   |
| `typeId`    | query | No       | `movie`, `show`, `season` or `episode` |

| Status                   | Cause          |
| ------------------------ | -------------- |
| `200`                    | The list       |
| `200` with an empty body | The read threw |

This never contacts the media server, so unlike `GET /api/collections` it cannot be emptied by an unconfigured one. It returns no artwork and no media metadata, only the membership rows.

Compute a leaving date as `addDate` plus `deleteAfterDays`, treating a null `deleteAfterDays` as "no leaving date". Remember the handler does not use that convention and treats null as `0`.

:::caution No paging and no cap
This is the only route that returns full membership for every collection at once. On a large install it serialises essentially the entire membership table in one response.
:::

### `GET /api/collections/media`

**List the raw membership rows for one collection.**

| Parameter      | Type           | Required | Description                                       |
| -------------- | -------------- | -------- | ------------------------------------------------- |
| `collectionId` | query, integer | **Yes**  | Maintainerr collection id. Omitting it is a `400` |

Response:

```json
[
  {
    "id": 1,
    "collectionId": 1,
    "mediaServerId": "12345",
    "tmdbId": 550,
    "addDate": "2026-06-05T00:00:00.000Z",
    "image_path": null,
    "isManual": true,
    "includedByRule": false,
    "manualMembershipSource": "local",
    "sizeBytes": null,
    "ruleEvaluationFailed": false
  }
]
```

| Status                   | Cause                                           |
| ------------------------ | ----------------------------------------------- |
| `200`                    | The rows. An unknown collection id returns `[]` |
| `200` with an empty body | The read threw                                  |
| `400`                    | `collectionId` is missing or not an integer     |

Prefer `includedByRule` and `manualMembershipSource` over `isManual`, which is a derived mirror. A row can be **both** rule-owned and manual at once.

`sizeBytes` is filled in lazily and is null for freshly added items. There is no paging, so a large collection returns every row in one response.

### `GET /api/collections/media/count`

**Count membership rows, for one collection or across all of them.**

| Parameter      | Type           | Required | Description                                     |
| -------------- | -------------- | -------- | ----------------------------------------------- |
| `collectionId` | query, integer | No       | Omit to count every row across every collection |

The response is a bare JSON number.

| Status | Cause                                           |
| ------ | ----------------------------------------------- |
| `200`  | The count. An unknown collection id returns `0` |
| `400`  | `collectionId` is present but not an integer    |
| `500`  | The database read failed                        |

This counts membership rows, not distinct items. An item in three collections counts three times in the unscoped form.

### `GET /api/collections/media/{id}/content/{page}`

**Return one page of a collection's members, with media server metadata attached.**

| Parameter   | Type           | Required | Description                                                                                   |
| ----------- | -------------- | -------- | --------------------------------------------------------------------------------------------- |
| `id`        | path, integer  | Yes      | Maintainerr collection id                                                                     |
| `page`      | path, integer  | Yes      | 1-based page number. Not lower-bounded, so page `0` produces a negative offset                |
| `sort`      | query          | No       | `title`, `airDate`, `rating`, `watchCount`, `manual`, `excluded`, `studio` or `deleteSoonest` |
| `sortOrder` | query          | No       | `asc` or `desc`                                                                               |
| `size`      | query, integer | No       | Page size, default `25`. **No upper bound**                                                   |

Response is `totalSize` plus `items`, where each item is the membership row plus a `mediaData` object holding the media server metadata.

| Status                   | Cause                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `200`                    | The page                                                                                             |
| `200` with an empty body | Anything threw, including no media server configured, a switch in progress, or an unreachable server |
| `400`                    | `id`, `page` or `size` is not an integer, or `sort` or `sortOrder` is outside its allowed values     |

:::caution Two sorting paths with different costs and different totals
Omitting `sort`, or using `deleteSoonest`, pages in the database and is cheap.

**Any other sort loads the entire collection**, sorts it in memory, and only then returns your page. On a large collection that is expensive.

The two paths also report `totalSize` differently. The cheap path counts every row, and items the media server could not resolve are skipped, so a page can be shorter than `size` while `totalSize` stays high. The sorting path counts only rows it could resolve. The same collection reports two different totals depending on how you sort it.
:::

Items the media server does not answer for are skipped, never deleted. This route cannot tell a missing item from a failed lookup.

Despite being a read, there is one write here: if the collection's linked media server collection is confirmed gone, the stale link is cleared. A lookup that merely fails keeps the link.

### `GET /api/collections/logs/{id}/content/{page}`

**Return one page of a collection's activity log.**

| Parameter | Type           | Required | Description                                                           |
| --------- | -------------- | -------- | --------------------------------------------------------------------- |
| `id`      | path, integer  | Yes      | Maintainerr collection id                                             |
| `page`    | path, integer  | Yes      | 1-based page number                                                   |
| `search`  | query          | No       | Substring match on the log message. An empty value matches everything |
| `sort`    | query          | No       | `ASC` or `DESC`. Defaults to `DESC`, newest first                     |
| `filter`  | query          | No       | Log type: `0` collection, `1` media, `2` rules. Not validated         |
| `size`    | query, integer | No       | Page size, default `25`. No upper bound                               |

Response is `totalSize` plus `items`, each holding `id`, `timestamp`, `message`, `type` and `meta`.

| Status | Cause                                                                 |
| ------ | --------------------------------------------------------------------- |
| `200`  | The page. An unknown collection id returns an empty page, not a `404` |
| `400`  | `id`, `page` or `size` is not an integer                              |
| `500`  | `sort` is not a usable sort direction. Only `ASC` and `DESC` are safe |

Log retention is governed by the collection's `keepLogsForMonths` setting and a cleanup task, so old entries disappear on their own. There is no way to delete a single entry.

### `GET /api/collections/exclusions/{id}/content/{page}`

**Return one page of the exclusions that apply to a collection.**

| Parameter   | Type           | Required | Description                                                               |
| ----------- | -------------- | -------- | ------------------------------------------------------------------------- |
| `id`        | path, integer  | Yes      | Maintainerr **collection** id, not the rule group id                      |
| `page`      | path, integer  | Yes      | 1-based page number                                                       |
| `sort`      | query          | No       | Same sort keys as the content route. Omitted means newest exclusion first |
| `sortOrder` | query          | No       | `asc` or `desc`                                                           |
| `size`      | query, integer | No       | Page size, default `25`. No upper bound                                   |

Returns `totalSize` plus `items`, each an exclusion row with a `mediaData` object attached.

| Status                   | Cause                                                                           |
| ------------------------ | ------------------------------------------------------------------------------- |
| `200`                    | The page, including an empty one when no rule group is linked to the collection |
| `200` with an empty body | The read threw, including an unreachable or unconfigured media server           |
| `400`                    | A path or query parameter failed validation                                     |

The type filter widens deliberately. A season rule group also lists show exclusions, and an episode rule group also lists show and season exclusions, because a parent exclusion suppresses its children. Global exclusions always appear.

`sort=manual` and `sort=excluded` are accepted but do nothing here, because this route does not attach that state.

Listing an exclusion is not the same as applying it. Exclusions only take effect on the next rule run.

## Creating and changing collections

### `POST /api/collections`

**Create a collection row, and when media is supplied the matching media server collection.**

Request body has a required `collection` object and an optional `media` array:

```json
{
  "collection": {
    "type": "movie",
    "libraryId": "1",
    "title": "Example collection",
    "isActive": true,
    "arrAction": 0,
    "deleteAfterDays": 30
  },
  "media": [{ "mediaServerId": "12345" }]
}
```

Required inside `collection` are `type`, `libraryId`, `title`, `isActive` and `arrAction`. `arrAction` must be the **number**, not the name: `0` delete, `1` unmonitor and delete all, `2` unmonitor and delete existing, `3` unmonitor, `4` do nothing, `5` delete show if empty, `6` unmonitor show if empty, `7` change quality profile.

| Status | Cause                                                                                      |
| ------ | ------------------------------------------------------------------------------------------ |
| `201`  | Always on a valid body, **including when the create failed internally**. The body is empty |
| `400`  | Validation failed                                                                          |

:::caution Nothing about the outcome reaches you
The response is an empty `201` whether it worked or not, and the new id is not returned. A manual collection whose named media server collection could not be found writes nothing at all and still answers `201`. Discover the result with `GET /api/collections`.
:::

:::danger deleteAfterDays: null becomes 0
`deleteAfterDays` is coerced, and an explicit JSON `null` becomes `0`, which the handler treats as "due immediately". Omitting the field stores no value, which the handler **also** treats as `0`.

Combined with `arrAction: 0`, that arms media deletion on the next handler run. Always set `deleteAfterDays` explicitly.
:::

A collection created here has no rule group, so nothing will ever add to or remove from it automatically, but the handler still acts on its members once the timer elapses.

No events are emitted by this route, so no "media added" notification is sent.

### `PUT /api/collections`

**Overwrite a collection's settings, re-pushing metadata to the media server or tearing the link down.**

Same field shape as the create route's `collection` object, but `id` is required, along with `type`, `libraryId`, `title`, `isActive` and `arrAction`.

| Status                   | Cause                                                 |
| ------------------------ | ----------------------------------------------------- |
| `200`                    | Saved. The body is the saved row under `dbCollection` |
| `200` with an empty body | Anything threw                                        |
| `400`                    | Validation failed                                     |

:::warning Destructive
Changing `type`, `libraryId`, `manualCollection` or `manualCollectionName` **deletes the linked collection on your media server**, or, when a sibling rule group shares it, strips this collection's items out of it. The link is then cleared.

Local membership rows survive, and the next add recreates the server collection and re-syncs them. The media server collection itself is not recoverable, though Maintainerr rebuilds an equivalent one.

If the media server cannot be reached, nothing is pushed and the link is kept on purpose.
:::

:::danger An omitted field can trigger that teardown
The change comparison runs against the **raw body**, not the merged result. On a stored manual collection, a `PUT` that simply omits `manualCollection` reads as a change and falls into the teardown branch.

Send the full object, including every field you want unchanged.
:::

This is a full replace, not a partial update. Omitted optional keys keep their stored value, but an explicit `null` overwrites.

There is no existence check and no `404`. A `PUT` with an id that does not exist **creates** a collection instead of failing.

Sending `keepInMaintainerrOnly` does nothing. It is stripped from the body, and the stored value is what decides whether metadata is pushed.

An empty or whitespace `sortTitle` is stored as null.

### `GET /api/collections/activate/{id}`

**Mark a collection and its rule group active again.**

| Parameter | Type    | Required | Description               |
| --------- | ------- | -------- | ------------------------- |
| `id`      | integer | Yes      | Maintainerr collection id |

| Status | Cause                                                      |
| ------ | ---------------------------------------------------------- |
| `200`  | Always, whether or not anything changed. The body is empty |
| `400`  | `id` is not an integer                                     |

Note this is a `GET` that changes state.

Activating does **not** restore membership. A previous deactivate deleted every membership row, so the collection comes back empty and stays empty until the next rule run repopulates it.

The response can never tell you whether it worked. An unknown id changes nothing and still answers `200`.

### `GET /api/collections/deactivate/{id}`

**Deactivate a collection, tearing down its media server collection and wiping its membership.**

| Parameter | Type    | Required | Description               |
| --------- | ------- | -------- | ------------------------- |
| `id`      | integer | Yes      | Maintainerr collection id |

| Status                     | Cause                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `200` with `status: "OK"`  | Deactivated                                                                                                                                            |
| `200` with `status: "NOK"` | The collection is shared with another rule group and its items could not be taken out, so nothing changed. Or something threw, including an unknown id |
| `400`                      | `id` is not an integer                                                                                                                                 |

:::warning Destructive
Despite the name, this is not a reversible pause. It **deletes every membership row** for the collection, and deletes the collection on your media server, or removes this collection's items from one shared with a sibling rule group.

**Membership cannot be restored.** Calling activate afterwards only flips the flags: the collection comes back empty and stays empty until the next rule run rebuilds it.

No media files are deleted.
:::

Also note this is a `GET` that changes state, and that the failure envelope arrives with a `200`, so you must inspect `status`.

If the media server delete failed for a collection nobody shares, the deactivation still proceeds and the link is kept, so the collection may be left standing on your media server.

### `POST /api/collections/removeCollection`

**Delete a collection, its media server collection, and everything that cascades from it.**

Request body:

```json
{ "collectionId": 1 }
```

| Status                     | Cause                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | Deleted, **or the id did not exist**                                                                                              |
| `201` with `status: "NOK"` | The media server collection could not be removed and nothing local was deleted, or the row delete failed, or something else threw |
| `400`                      | Validation failed                                                                                                                 |

:::warning Destructive
Deletes the Maintainerr collection row and, by cascade, **its rule group**, along with that group's rules, its notification links, all membership rows and the whole collection log. Deleting a collection therefore deletes its rule.

It also deletes the collection on your media server, reverts any overlays it applied by restoring original posters, and deletes the stored custom poster file from disk.

**None of this is recoverable.** No media files are deleted.
:::

A failed media server teardown is a hard stop: the row survives and the message carries the server's own explanation, such as Plex naming its media deletion setting. Fix that and retry.

Deleting a collection that does not exist reports success, so the envelope is not proof anything existed.

Rule-group-scoped exclusions are left behind as orphans when the group cascades away.

## Membership

### `POST /api/collections/add`

**Add media server items to one collection, creating or repairing the media server collection as needed.**

Request body:

```json
{
  "collectionId": 1,
  "media": [{ "mediaServerId": "12345" }],
  "manual": false
}
```

| Field          | Type    | Required | Description                |
| -------------- | ------- | -------- | -------------------------- |
| `collectionId` | number  | Yes      | Target collection          |
| `media`        | array   | Yes      | Items to add. May be empty |
| `manual`       | boolean | No       | Defaults to `false`        |

| Status | Cause                                                                                                                 |
| ------ | --------------------------------------------------------------------------------------------------------------------- |
| `201`  | Always on a valid body, **including when the collection does not exist or every item was refused**. The body is empty |
| `400`  | Validation failed                                                                                                     |

:::warning Destructive
Adding an item **starts its deletion timer**. Once `deleteAfterDays` elapses, the collection handler runs the collection's action on it, which for a delete action permanently removes the media files.

The membership itself is reversible: remove the item to end it.
:::

`manual` matters. The default `false` marks the item as rule-owned, so the owning rule group's next run can remove it again. Setting `true` marks it as a manual member, which survives rule runs.

This route takes raw media server ids only, with no hierarchy resolution. Use `POST /api/collections/media/add` when a show id needs expanding into seasons or episodes.

The response hides every failure. A nonexistent collection id and server-refused items both answer an empty `201`.

### `POST /api/collections/media/add`

**Manually add one item, with its resolved hierarchy, to a collection, or remove it.**

Despite the path, this handles both directions, chosen with `action`.

Request body for an add:

```json
{
  "action": 0,
  "mediaId": "12345",
  "collectionId": 1,
  "context": { "id": "12345", "type": "show" }
}
```

| Field          | Type   | Required   | Description                                                                                                 |
| -------------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `action`       | number | Yes        | `0` adds, `1` removes                                                                                       |
| `mediaId`      | string | Yes        | The item to act on                                                                                          |
| `context`      | object | Yes        | `id` and `type`, saying which level of the hierarchy was acted on. May also carry `index` and `parentIndex` |
| `collectionId` | number | For an add | Required to add. **Omit it on a removal to remove from every collection**                                   |

The `context` is expanded against the media server into the ids the target collection can actually hold. A show id becomes its season ids for a season collection, or its episode ids for an episode collection.

| Status | Cause                                                                               |
| ------ | ----------------------------------------------------------------------------------- |
| `201`  | Success. The body is the collection, or empty on a global removal                   |
| `400`  | Validation failed, or the item resolved to nothing the collection can take          |
| `404`  | `Collection {id} not found`                                                         |
| `502`  | The media server could not resolve the item, refused some ids, or the update failed |
| `503`  | A media server switch is in progress, or credentials are not saved                  |
| `500`  | No media server type configured                                                     |

:::warning Destructive
Adding **starts the deletion timer**, so an item added to a collection whose action deletes will eventually have its files deleted.

A manual add is not an exclusion. It stops rules removing the item, but it does not stop the collection's own action.

Removing ends membership only. No media files, `*arr` entries or Seerr requests are touched.
:::

A `502` does not mean nothing happened. Items the server accepted were still added.

On a global removal the item **and every descendant** are removed from every collection, so removing a show also drops its seasons and episodes.

### `POST /api/collections/media/bulk`

**Add or remove a selection of items to or from one collection, or from every collection.**

This is the bulk form, and the one the web UI actually uses. It backs the add and remove media modal described in [Collections](../Collections.md#add-remove-media-modal).

Request body:

```json
{
  "mediaIds": ["12345", "12346"],
  "collectionId": 1,
  "action": 0,
  "mediaType": "movie",
  "context": { "id": "12345", "type": "season" }
}
```

| Field          | Type     | Required   | Description                                                                                                 |
| -------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `mediaIds`     | string[] | Yes        | 1 to 250 media server ids                                                                                   |
| `action`       | number   | Yes        | `0` adds, `1` removes                                                                                       |
| `mediaType`    | string   | Yes        | `movie`, `show`, `season` or `episode`. Required so the hierarchy can be resolved without a lookup per item |
| `collectionId` | number   | For an add | Omit on a removal to mean every collection. **Not coerced**, so a string id is a `400`                      |
| `context`      | object   | No         | Narrows a one-item selection to a single season or episode. Sending it with more than one id is an error    |

Response:

```json
{
  "results": [
    { "mediaId": "12345", "code": 1 },
    {
      "mediaId": "12346",
      "code": 0,
      "message": "Failed - refused by the media server"
    }
  ]
}
```

There is one result per **deduplicated** id, so repeating an id yields fewer results than you sent. `code` is `1` for success and `0` for failure.

| Status | Cause                                                              |
| ------ | ------------------------------------------------------------------ |
| `201`  | Returned **even when every item failed**. Check `results[].code`   |
| `400`  | Validation failed, or an add was requested with no `collectionId`  |
| `404`  | `Collection {id} not found`                                        |
| `503`  | A media server switch is in progress, or credentials are not saved |
| `500`  | No media server type configured                                    |

:::warning Destructive
Adding **starts the deletion timer** for every item added. A removal with no `collectionId` iterates every collection in the database.

No media files, `*arr` entries or Seerr requests are touched.
:::

The 250 limit applies to one request, not to how much you can select. The web UI sends 25 ids per request and splits larger selections across several calls, so only direct API callers reach it.

On a removal, membership is re-read afterwards and any id still present is reported as refused, so a success here really does mean the row is gone.

### `POST /api/collections/remove`

**Remove media items from one collection, locally and on the media server.**

Request body:

```json
{ "collectionId": 1, "media": [{ "mediaServerId": "12345" }] }
```

| Status | Cause                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------- |
| `201`  | Always on a valid body, including for an unknown collection id or an unreachable media server. The body is empty |
| `400`  | Validation failed                                                                                                |

:::warning Destructive
Deletes the membership rows and removes the items from the linked media server collection. **No media files are deleted**, no `*arr` entity is touched, and no Seerr request is removed.

Reversible by re-adding, but the deletion timer restarts from scratch on re-add.

If this empties an automatic collection, the collection on your media server is **deleted** as a side effect, or merely unlinked when a sibling rule group shares it.
:::

Removal is not sticky. It adds no exclusion, so the owning rule group's next run can re-add the item immediately. Use an [exclusion](./rules.md#post-apirulesexclusionsbulk) if you want it to stay out.

All failures are silent: the response is an empty `201` either way.

### `DELETE /api/collections/media`

**Remove one item from a single collection, or from every collection.**

| Parameter      | Type           | Required | Description                                                                                       |
| -------------- | -------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `mediaId`      | query          | No       | Media server item id. Not validated. **Omitting it is a silent no-op that still reports success** |
| `collectionId` | query, integer | No       | Omit, or send `0`, to remove from every collection                                                |

| Status | Cause                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `200`  | Always. With `collectionId`, the body is the collection, or empty on an internal failure. Without it, the body is a `status` and `code` envelope |
| `400`  | `collectionId` is present but not an integer                                                                                                     |

:::warning Destructive
Deletes the membership rows and removes the item from the linked media server collection. **No media files are deleted.**

Reversible by re-adding, though the deletion timer restarts. If this empties an automatic collection, the media server collection is deleted.
:::

The two branches report failure differently: the single-collection branch signals it with an empty body, and the all-collections branch with `status: "NOK"`.

There is no hierarchy expansion here, so removing a show from a season collection removes nothing.

## Handling

These are the routes that can permanently delete media.

### `POST /api/collections/handle`

**Start the collection handler run that executes every collection's action on its due media.**

Takes no request body.

| Status | Cause                                                              |
| ------ | ------------------------------------------------------------------ |
| `201`  | The run was **started**. It does not mean it finished or succeeded |
| `409`  | `The collection handler is already running`                        |

:::danger Destructive: this deletes media files
This runs every active collection's configured action against every member whose deletion timer has elapsed.

For `DELETE`, `UNMONITOR_DELETE_EXISTING`, `UNMONITOR_DELETE_ALL` and `DELETE_SHOW_IF_EMPTY` that means **permanently deleting the media files from disk** through Radarr, Sonarr or Sportarr, removing the entity from that `*arr`, optionally adding an import list exclusion, and removing matching downloads from your download client. With `cleanupLeftoverFolders` on, the stranded folder and its sidecars are deleted too.

With no `*arr` configured and a delete action, Maintainerr calls the media server's own delete instead.

With `forceSeerr` on, the item's Seerr request and media record are deleted as well.

**None of the file deletion is reversible.**

`UNMONITOR`, `UNMONITOR_SHOW_IF_EMPTY` and `CHANGE_QUALITY_PROFILE` leave files alone.
:::

The run is fire and forget, so a `201` only means it was accepted. Watch the [events stream](./metadata-and-storage.md#get-apieventsstream) or the collection logs for the outcome.

The `409` only covers the handler itself. A request during a rule run succeeds and simply queues behind it.

Several things protect an item: rows whose rule evaluation failed on the last run are skipped unless they are manual members, items currently being streamed are deferred to the next run, and excluded items are dropped. Exclusions are the only thing protecting a manually added member.

If the media server cannot be reached the entire run is skipped.

### `POST /api/collections/media/handle`

**Immediately run the collection's action against one item, ahead of its deletion timer.**

Request body:

```json
{ "collectionId": 1, "mediaId": "12345" }
```

`collectionId` is **not** coerced here, so it must be a number, unlike the postpone route.

| Status | Cause                                                                                 |
| ------ | ------------------------------------------------------------------------------------- |
| `201`  | The item was handled, or was pruned because it no longer exists on the media server   |
| `400`  | Validation failed                                                                     |
| `404`  | `Collection not found` or `Media not found in collection`                             |
| `409`  | The handler or rule queue is already running, **or the action could not be executed** |
| `500`  | Something in the chain threw                                                          |
| `503`  | A media server switch is in progress, or credentials are not saved                    |

:::danger Destructive: this deletes media files
The same action chain as the full handler run, applied to one item. With a delete action this **permanently deletes the media files** and is not reversible.

It ignores the deletion timer entirely, so it acts even on an item that is nowhere near due. There is also no active check, so an item in a deactivated collection can still be handled.
:::

A `409` does not always mean "busy". It is also the answer when the action could not run at all, including a collection whose action is "do nothing", a library and `*arr` mismatch, and an `*arr` that could not be reached. In those cases the item stays in the collection.

The whole chain runs inside the request, so a large show can hold the connection open for a long time, and holds the shared execution lock for the same duration, blocking rule runs.

### `POST /api/collections/media/postpone`

**Push out, or fully reset, the deletion timer for one item.**

Request body:

```json
{ "collectionId": 1, "mediaId": "12345", "days": 14 }
```

| Field          | Type   | Required | Description                                                            |
| -------------- | ------ | -------- | ---------------------------------------------------------------------- |
| `collectionId` | number | Yes      | Coerced, so a string id is accepted                                    |
| `mediaId`      | string | Yes      | Media server item id                                                   |
| `days`         | number | No       | Between `1` and `3650`. **Omit to restart the full window from today** |

Response:

```json
{
  "collectionId": 1,
  "mediaServerId": "12345",
  "addDate": "2026-06-05T00:00:00.000Z",
  "deleteAfterDays": 30,
  "deletionDate": "2026-07-05T00:00:00.000Z"
}
```

| Status | Cause                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------- |
| `201`  | Success. Note the OpenAPI document says `200`, which is wrong                                                       |
| `400`  | Validation failed                                                                                                   |
| `404`  | `Media not found in collection`, returned both when the collection does not exist and when the item is not a member |
| `409`  | A run held the lock for the full 30 seconds                                                                         |

This is fully reversible: post again with different values.

It waits up to 30 seconds for the shared execution lock rather than failing fast, because a run already in flight could otherwise delete the item despite the postpone. If the item is handled by that in-flight run, you get a `404`, which is the definite answer.

When `days` is supplied and the item is already overdue, the new date is measured from the handler's own cutoff rather than the stale date, so the deadline cannot land in the past.

A postpone is not an exclusion and not a manual add. The rule executor can still remove the item from the collection, and re-adding later resets the timer to that day.

## Posters

### `GET /api/collections/{id}/poster`

**Stream the stored custom poster image for a collection.**

| Parameter | Type    | Required | Description               |
| --------- | ------- | -------- | ------------------------- |
| `id`      | integer | Yes      | Maintainerr collection id |

Returns `image/jpeg` bytes. Always JPEG, whatever was uploaded.

| Status | Cause                                                                               |
| ------ | ----------------------------------------------------------------------------------- |
| `200`  | The poster is streamed                                                              |
| `400`  | `id` is not an integer                                                              |
| `404`  | `No custom poster set for this collection`. This is the normal answer, not an error |
| `500`  | The file disappeared between the check and the read                                 |

A `HEAD` request works too, which is how the UI probes whether a custom poster is set.

The collection row is never consulted, so a leftover file for a deleted collection id still streams a `200`.

These are Maintainerr's local bytes, not whatever your media server is currently showing. The two can differ if another tool overwrote the artwork.

### `POST /api/collections/{id}/poster`

**Upload a custom poster, store it locally, and push it to the media server.**

Send `multipart/form-data` with a single file field named `poster`.

| Parameter | Type          | Required | Description                                                               |
| --------- | ------------- | -------- | ------------------------------------------------------------------------- |
| `id`      | path, integer | Yes      | Maintainerr collection id                                                 |
| `poster`  | file          | Yes      | The image. Maximum **500 KB**. Any format that can be decoded is accepted |

Response:

```json
{ "pushed": true, "attempted": true }
```

| Status | Cause                                                                       |
| ------ | --------------------------------------------------------------------------- |
| `201`  | Success, regardless of whether the media server push worked                 |
| `400`  | No file uploaded, the file is not a valid image, or the field name is wrong |
| `404`  | `Collection not found`                                                      |
| `413`  | The file exceeds 500 KB                                                     |
| `500`  | The data directory is not writable                                          |

:::warning Destructive
This **overwrites** two things with no backup: the stored poster file on disk, and the artwork of the linked collection on your media server. Neither previous image is recoverable.
:::

`attempted: false` means the push was never tried, because the collection has no linked media server collection yet, no media server is reachable, or the server does not support collection posters. The file is still stored and is pushed automatically the first time Maintainerr creates the collection.

Whatever you upload comes back as JPEG. A PNG or WebP is transcoded and transparency is lost.

Maintainerr is one writer among several here. This is a single push, not a continuously reapplied overlay, so another tool can overwrite it afterwards.

### `DELETE /api/collections/{id}/poster`

**Delete the stored custom poster and ask the media server to refresh its metadata.**

| Parameter | Type    | Required | Description               |
| --------- | ------- | -------- | ------------------------- |
| `id`      | integer | Yes      | Maintainerr collection id |

Response:

```json
{ "cleared": true, "refreshRequested": true }
```

| Status | Cause                                                            |
| ------ | ---------------------------------------------------------------- |
| `200`  | Success                                                          |
| `400`  | `id` is not an integer                                           |
| `404`  | `Collection not found`                                           |
| `500`  | The file could not be deleted, for example a permissions problem |

:::warning Destructive
Permanently deletes the stored poster file from disk. **This cannot be undone**, and Maintainerr keeps no copy.

It does **not** put the original artwork back on your media server. It only asks the server to refresh, and whether the original returns depends entirely on that server's own agents and caching. The poster Maintainerr pushed may well stay visible.
:::

`cleared: true` does not mean a file was actually removed. It is returned unconditionally, so clearing a poster that was never uploaded also reports `cleared: true`.

`refreshRequested: false` is not an error. It means the collection has no linked media server collection, no media server is reachable, or the refresh call failed.

## Schedule

### `PUT /api/collections/schedule/update`

**Re-time the live collection handler cron job.**

Request body:

```json
{ "schedule": "0 */12 * * *" }
```

| Status               | Cause                                                   |
| -------------------- | ------------------------------------------------------- |
| `200` with `code: 1` | Rescheduled                                             |
| `200` with `code: 0` | The job is not registered, or restarting it threw       |
| `400`                | Validation failed, including an invalid cron expression |

Note the envelope here has `code` and `message` but **no `status` key**, unlike most write routes on this page.

:::caution This does not persist the schedule
The stored setting is untouched, so the change is lost on restart when the job is recreated from the saved value.

The supported way to change the schedule is the [settings endpoint](./settings.md#post-apisettings), which persists it and then calls this route internally.
:::

The expression must be exactly 5 fields. A 6-field expression with seconds is rejected.

If a run is in flight the job is stopped and restarted underneath it. The running execution is unaffected.
