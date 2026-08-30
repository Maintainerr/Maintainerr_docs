---
slug: /api/rules
title: Rules API
description: Rule groups, rule execution, exclusions, community rules, and YAML import and export.
---

Rule groups and everything around them: creating and editing them, running them, excluding media from them, and the shared community rule list. See the [Rules](../Rules.mdx) page for what rules do.

See [API conventions](../API.md#api-conventions) for the rules that apply across the API.

## What a rule run does, and does not do

A rule run decides **membership**. It evaluates each item in the library against the group's rules and adds matching items to the collection or removes items that no longer match.

It never deletes media. Deleting files, unmonitoring in an `*arr`, and cleaning up Seerr are done later by the [collection handler](./collections.md#post-apicollectionshandle), once an item's delete-after countdown has elapsed.

The link between the two is the countdown: **adding an item to a collection starts its timer**. So a rule run is not itself destructive, but it is what puts media on the path to deletion.

## The response envelope on this page

Most write routes here answer with `code`, `result` and `message`, where `code` is `1` for success and `0` for failure:

```json
{ "code": 1, "result": "Success", "message": "Success" }
```

This is not the same envelope as the `status` and `code` one used elsewhere. And on many of these routes a failure still comes back as `200` or `201`, so check `code` rather than the status line. Where a route converts a failure into a real HTTP error instead, that is noted.

## Rule groups

### `GET /api/rules`

**List rule groups with their rules, collection and notification agents.**

| Parameter    | Type           | Required | Description                                                                                                     |
| ------------ | -------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `activeOnly` | query          | No       | Only the exact string `true` filters to active groups. Anything else, including `1` and `TRUE`, means no filter |
| `libraryId`  | query          | No       | Media server library id. **Takes precedence and makes `typeId` ignored entirely**                               |
| `typeId`     | query, integer | No       | Only applied when `libraryId` is absent                                                                         |

Each group carries `id`, `name`, `description`, `libraryId`, `isActive`, `collectionId`, `useRules`, `dataType`, `ruleHandlerCronSchedule`, plus nested `rules`, `notifications` and `collection`.

| Status                   | Cause                                  |
| ------------------------ | -------------------------------------- |
| `200`                    | The list                               |
| `200` with an empty body | The database read failed               |
| `400`                    | `typeId` is present but not an integer |

:::danger This route returns notification secrets in cleartext
Each group's `notifications[].options` is included unmasked. That can carry Discord, Slack and generic webhook URLs, Telegram bot tokens, Pushbullet and Pushover tokens, Gotify and ntfy tokens, webhook auth headers, and SMTP passwords and PGP keys.

Unlike `GET /api/settings`, nothing is masked here. See [Security and Authentication](../Security.md).
:::

:::caution typeId does not work
`typeId` is parsed as an integer, but the field it filters on holds a string such as `movie` or `show`. A numeric `typeId` therefore matches nothing and the route returns `[]`. Use `libraryId`, which is the only filter the web UI sends.
:::

### `GET /api/rules/{id}`

**Fetch one rule group with its rules, collection and notification agents.**

| Parameter | Type    | Required | Description   |
| --------- | ------- | -------- | ------------- |
| `id`      | integer | Yes      | Rule group id |

| Status                   | Cause                                     |
| ------------------------ | ----------------------------------------- |
| `200`                    | The group                                 |
| `200` with an empty body | No group with that id, or the read failed |
| `400`                    | `id` is not an integer                    |

There is no `404` here, which is the easiest thing to get wrong. Check for an empty body.

Fields such as `arrAction`, `listExclusions`, `forceSeerr` and the `*arr` settings ids come back nested under `collection`, not at the top level. `rules[].ruleJson` is a JSON **string** and is not expanded for you.

As with the list route, `notifications[].options` is unmasked.

### `GET /api/rules/collection/{id}`

**Fetch the rule group that owns a given collection.**

| Parameter | Type    | Required | Description                            |
| --------- | ------- | -------- | -------------------------------------- |
| `id`      | integer | Yes      | **Collection** id, not a rule group id |

| Status                   | Cause                                                  |
| ------------------------ | ------------------------------------------------------ |
| `200`                    | The group                                              |
| `200` with an empty body | No rule group owns that collection, or the read failed |
| `400`                    | `id` is not an integer                                 |

Unlike `GET /api/rules/{id}`, the response has **no `rules` array at all**. Use the other route if you need the rules.

`notifications[].options` is unmasked here too.

### `GET /api/rules/{id}/rules`

**List the raw stored rule rows belonging to one rule group.**

| Parameter | Type    | Required | Description   |
| --------- | ------- | -------- | ------------- |
| `id`      | integer | Yes      | Rule group id |

Each row is `id`, `ruleJson`, `ruleGroupId`, `section` and `isActive`. `ruleJson` parses to an object with `operator`, `action`, `firstVal`, and optionally `lastVal`, `customVal`, `arrDiskPath` and `username`.

| Status                   | Cause                                                |
| ------------------------ | ---------------------------------------------------- |
| `200`                    | The rows. An id that never existed also returns `[]` |
| `200` with an empty body | The read failed                                      |
| `400`                    | `id` is not an integer                               |

`section` groups rules into blocks, and `operator` is `0` for AND, `1` for OR, and null on the first rule of a section. `isActive: false` means the rule is stored but skipped during evaluation.

Rows come back in no guaranteed order, unlike the other two routes which order by id. Do not rely on the order when reconstructing sections.

### `GET /api/rules/count`

**Return the total number of rule groups.**

The response is a bare number sent as **plain text**, not JSON.

| Status | Cause                    |
| ------ | ------------------------ |
| `200`  | The count                |
| `500`  | The database read failed |

This counts every row with no filtering, so it will not agree with the length of `GET /api/rules`, which filters.

### `POST /api/rules`

**Create a rule group, its collection and its rules.**

The body is a rule group object. Required are `libraryId`, `name`, `description`, `dataType` and `rules`. It also accepts `isActive`, `useRules`, `ruleHandlerCronSchedule`, `notifications` (only each entry's `id` is used), and a nested `collection` block carrying `deleteAfterDays`, `manualCollection`, `manualCollectionName`, `visibleOnRecommended`, `visibleOnHome`, `keepLogsForMonths`, `sortTitle`, `mediaServerSort`, `overlayEnabled` and `overlayTemplateId`.

The body is **not** schema-validated. Unknown fields pass through, and missing ones are only caught by the hand-written checks below.

| Status | Cause                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------- |
| `201`  | Created                                                                                         |
| `400`  | A validation check failed. The message says which                                               |
| `500`  | The collection could not be created, or the save failed                                         |
| `502`  | `No libraries could be read from the media server. Check its connection in the settings.`       |
| `503`  | Credentials are not saved, the adapter failed to start, or a media server switch is in progress |

Validation covers a lot: every rule after the first needs an operator, values must exist on the selected server and their types must match, an action must be supported for the type, a collection cannot be managed by both Sonarr and Sportarr, `deleteAfterDays` must be a whole number from `0` to `36500`, rules for a given `*arr` need that server selected, a disk target path is only allowed on disk space rules, a username is only allowed on per-user properties and must actually exist on the media server, and the library must exist.

Creating a rule group does **not** run it. The collection stays empty until a run fills it.

:::caution Omitting useRules saves a group with no rules
The stored group defaults `useRules` to `true`, but the rule rows are only written when you actually send `useRules`. Omitting it therefore saves a group flagged as using rules that has none behind it.
:::

Some values you send are deliberately overruled: `cleanupLeftoverFolders` is forced off unless the chosen action can actually strand a folder, `forceSeerr` is forced off for an episode collection, and `keepInMaintainerrOnly` is forced off for a manual collection. `dataType` only matters for a TV library, since a movie library always produces a movie collection.

### `PUT /api/rules`

**Update an existing rule group and rewrite all of its rules.**

Same body as the create route plus a required `id`.

| Status | Cause                                                                              |
| ------ | ---------------------------------------------------------------------------------- |
| `200`  | Updated                                                                            |
| `400`  | A validation check failed, or `id` is missing                                      |
| `404`  | `Rule group not found`                                                             |
| `500`  | The collection could not be saved, or the save failed                              |
| `502`  | The media server's library list could not be read                                  |
| `503`  | Credentials are not saved, the adapter failed to start, or a switch is in progress |

:::warning Destructive: changing four fields wipes membership and exclusions
If `dataType`, `libraryId`, `manualCollection` or `manualCollectionName` differs from what is stored, Maintainerr treats it as a change of identity and, before saving anything:

- **deletes every membership row** for the collection,
- **deletes every exclusion scoped to this rule group**,
- releases the collection on the media server, deleting an automatic one outright, or removing just this collection's items from one a sibling group shares. A manual collection is left alone,
- clears the link.

**None of that is recoverable.** The collection is rebuilt from scratch by the next run, and the exclusions have to be recreated by hand.

No media files are deleted and nothing leaves your library.
:::

This always rewrites every rule row from the payload. It is a full replace.

:::caution Omitting the collection block loses settings
Omitting `collection` keeps the stored `visibleOnRecommended`, `visibleOnHome`, `manualCollection` and `manualCollectionName`. But `deleteAfterDays`, `sortTitle`, `mediaServerSort`, `overlayEnabled` and `overlayTemplateId` fall back to empty rather than to their stored values, and `keepLogsForMonths` resets to `6`.

Send the full object, including the collection block, on every update.
:::

Deactivating a group by sending `isActive: false` drops its cron job and removes it from the run queue, but leaves the collection's contents in place.

### `DELETE /api/rules/{id}`

**Delete a rule group together with its collection and exclusions.**

| Parameter | Type    | Required | Description   |
| --------- | ------- | -------- | ------------- |
| `id`      | integer | Yes      | Rule group id |

| Status               | Cause                                                                       |
| -------------------- | --------------------------------------------------------------------------- |
| `200` with `code: 1` | Deleted. **An id that does not exist also reports success**                 |
| `200` with `code: 0` | The media server refused to delete the collection, or something else failed |
| `400`                | `id` is not an integer                                                      |

:::warning Destructive
Deletes the rule group, its rules and its notification links, **and its whole collection**: every membership row, the entire collection log, and every exclusion scoped to this group. The stored collection poster is deleted from disk, and overlays are reverted first.

On your media server, an automatic linked collection is **deleted**. One shared with a sibling group has only this collection's items removed. A manual collection is left alone, since it is yours.

**None of this is reversible.** Recreating the rule group starts from an empty collection. Global exclusions survive.

No media files are deleted and nothing leaves your library.
:::

If the media server refuses the delete, **nothing at all** is removed and the group stays intact so you can fix the server setting and retry.

Any queued or in-flight run for the group is cancelled.

## Running rules

### `POST /api/rules/execute`

**Queue every active rule group for immediate execution.**

Takes no request body.

| Status | Cause                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| `201`  | The groups were **queued**. Fire and forget                                                                        |
| `409`  | The executor is already running, no rule groups exist, none are active, or every active group is missing a library |

:::warning Destructive to collection membership
A run adds items to and removes items from collections, on both sides: Maintainerr's records and the linked collection on your media server. It also reconciles `*arr` membership tags, and fires notification agents.

**No media files are deleted and nothing leaves your library.** But adding an item **starts its delete-after countdown**, and the collection handler acts on it later.
:::

A `201` only means the groups were queued. Poll `GET /api/rules/execute/status`.

Exclusions are applied at membership time, so an excluded item, or a child covered by an ancestor's exclusion, is filtered out of the results and therefore removed from the collection. Items whose rule data was temporarily unavailable are kept rather than removed.

If the media server is unreachable when the queue starts, the whole queue is silently dropped. If it becomes unreachable partway, the rest of the queue is dropped with a warning.

The pre-flight check only requires **one** active group to have a library, but every active group is queued, so library-less groups still run and fail.

### `POST /api/rules/{id}/execute`

**Queue one rule group for immediate execution.**

| Parameter | Type    | Required | Description   |
| --------- | ------- | -------- | ------------- |
| `id`      | integer | Yes      | Rule group id |

| Status | Cause                                                                             |
| ------ | --------------------------------------------------------------------------------- |
| `201`  | Queued. Fire and forget                                                           |
| `400`  | `id` is not an integer                                                            |
| `404`  | `Rule group not found`                                                            |
| `409`  | The group is not active, has no library assigned, or is already running or queued |

:::warning Destructive to collection membership
The same effects as the global run, scoped to one group. Adding an item **starts its delete-after countdown**. No media files are deleted by this route.
:::

Unlike the global run, this queues even while another group is executing. It only rejects a duplicate of the same group.

### `GET /api/rules/execute/status`

**Report whether the rule executor queue is draining and which groups are running or waiting.**

Response:

```json
{
  "processingQueue": true,
  "executingRuleGroupId": 3,
  "pendingRuleGroupIds": [4],
  "queue": [5, 6]
}
```

| Status | Cause                           |
| ------ | ------------------------------- |
| `200`  | Always. The handler cannot fail |

Polling this is the only way over HTTP to know a run finished, because the execute routes are fire and forget.

The three id fields are different sets. `queue` is work not yet claimed, `pendingRuleGroupIds` is claimed but waiting on the lock, and `executingRuleGroupId` is the one actually running and is excluded from the pending list.

:::caution processingQueue is about rules only
A collection handler run holds the same lock but does **not** set this flag. `processingQueue: false` therefore does not mean nothing is handling collections.
:::

All of this is in memory and resets on restart, so a run interrupted by a restart leaves no trace.

### `POST /api/rules/execute/stop`

**Stop the running rule executor and clear its queue.**

Takes no request body. The response body is always empty, so the status is the only signal.

| Status | Cause                                                                              |
| ------ | ---------------------------------------------------------------------------------- |
| `200`  | Nothing was running. No action taken                                               |
| `202`  | A stop was **requested**. The queue is cleared and the in-flight group is aborting |

`202` means requested, not stopped. The run stops at its next checkpoint. Poll the status route.

Aborting mid-run leaves whatever membership changes were already made in place. There is no rollback, and a collection can be left half-reconciled until the next run.

### `POST /api/rules/{id}/execute/stop`

**Stop or dequeue one rule group's execution.**

| Parameter | Type    | Required | Description   |
| --------- | ------- | -------- | ------------- |
| `id`      | integer | Yes      | Rule group id |

| Status | Cause                                                                       |
| ------ | --------------------------------------------------------------------------- |
| `200`  | The group was neither running nor queued. Nothing done                      |
| `202`  | Stop requested. The group is dequeued, and aborted if it was the active run |
| `400`  | `id` is not an integer                                                      |

A stopped group is not re-queued automatically. It waits for its own schedule or the global one.

### `POST /api/rules/test`

**Evaluate one rule group against a single media item and return the comparison breakdown.**

Request body:

```json
{ "mediaId": "12345", "rulegroupId": 1 }
```

Note the lower-case `g` in `rulegroupId`. `mediaId` may be a show, season or episode id.

Response on success is `code: 1` and a `result` array. Each entry carries `mediaServerId`, an overall `result` boolean, and `sectionResults`, each holding per-rule results with `firstValueName`, `firstValue`, `secondValue`, `action`, `operator` and `result`, plus reason strings when a value could not be read.

| Status | Cause                                                                                                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `201`  | Handled. `code: 0` with a reason for `Rule group not found`, `Rule group does not use rules`, `Invalid input` when the item's metadata could not be read, or an evaluation error |
| `500`  | No media server type configured, or a metadata read threw                                                                                                                        |
| `503`  | Credentials are not saved, the adapter failed to start, or a switch is in progress                                                                                               |

This only reports whether the item matches. It never changes collection membership.

:::caution Read-only, but not free
To see live data it **flushes shared caches process-wide**: the Seerr, Tautulli, Streamystats and every Radarr, Sonarr and Sportarr cache, plus this item's metadata entry.

A concurrent or subsequent rule run then has to re-fetch everything. This is also not serialised against the execution lock, so it can run during a rule run.
:::

A missing property or an unconfigured service shows up as a per-rule reason string rather than an error.

## Exclusions

An exclusion stops a rule run from adding an item back to a collection. It does **not** remove anything already in a collection, and it does not delete anything.

An exclusion with no rule group is **global** and protects the item in every rule group. One with a rule group is scoped to that group only.

### `GET /api/rules/exclusion`

**List exclusion rows for one rule group or for one media item.**

| Parameter       | Type           | Required | Description                                                                                  |
| --------------- | -------------- | -------- | -------------------------------------------------------------------------------------------- |
| `rulegroupId`   | query, integer | No       | That group's exclusions **plus every global one**. Takes precedence. Note the lower-case `g` |
| `mediaServerId` | query          | No       | Rows whose id or `parent` matches. Ignored when `rulegroupId` is present                     |

| Status                   | Cause                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `200`                    | The rows. **Calling with no parameters returns `[]`**, it does not list everything |
| `200` with an empty body | The read failed                                                                    |
| `400`                    | `rulegroupId` is present but not an integer                                        |

There is no route that dumps every exclusion.

:::caution parent is not a hierarchy link
`parent` records the id the original exclusion request **entered through**, not the structural parent. A season excluded directly stores its own id as `parent`, so querying by the show id will not surface it.
:::

`type` can be null on exclusions created before the column existed. Maintainerr backfills those at startup, but only when the media server is reachable.

### `POST /api/rules/exclusion`

**Add or remove one exclusion for a media item, cascading to its children.**

Request body:

```json
{ "mediaId": "12345", "collectionId": 1, "action": 0 }
```

| Field          | Type   | Required | Description                                                           |
| -------------- | ------ | -------- | --------------------------------------------------------------------- |
| `mediaId`      | string | Yes      | Media server item id                                                  |
| `action`       | number | No       | `0` adds (the default), `1` removes                                   |
| `collectionId` | number | No       | Scopes the exclusion to that collection's rule group                  |
| `ruleGroupId`  | number | No       | Scopes directly. **Overwritten by `collectionId` when both are sent** |
| `context`      | object | No       | `id` and `type`, narrowing the action to one season or episode        |

Nothing in this body is validated.

| Status | Cause                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `201`  | Handled, **including every business failure**: `Failed - no rule group`, `Failed - no metadata`, `Failed - media server unreadable`, or `Failed` |
| `409`  | The 30-second wait for the execution lock expired. Adds only                                                                                     |
| `500`  | No media server type configured, or the metadata read threw                                                                                      |
| `503`  | Credentials are not saved, the adapter failed to start, or a switch is in progress                                                               |

:::warning Destructive
Writes or deletes exclusion rows for the item and everything it cascades to, and can apply or strip the protective Radarr or Sonarr tag.

Removing an exclusion re-exposes the item: the next run can add it back to the collection and **start its delete-after countdown**, which is the way back onto the deletion path.

No media files are deleted and nothing is removed from a collection or a library.
:::

Unlike the bulk route, this does **not** take the item out of the collection. It only writes the exclusion, so the item stays a member until the next run filters it out.

:::danger A removal with no scope deletes every exclusion for the item
On the remove path, sending neither `collectionId` nor `ruleGroupId` deletes **every** exclusion row for each resolved id, global and every rule group's alike. Always scope a removal unless you really mean all of them.
:::

Global exclusions subsume scoped ones. A scoped add is skipped when a global row already exists, and a global add deletes the item's scoped rows.

### `POST /api/rules/exclusions/bulk`

**Add or remove exclusions for up to 250 media items, reporting per item.**

This is the route the web UI uses for everything.

Request body:

```json
{
  "mediaIds": ["12345", "12346"],
  "collectionId": 1,
  "action": 0,
  "context": { "id": "12345", "type": "season" }
}
```

| Field          | Type     | Required | Description                                                             |
| -------------- | -------- | -------- | ----------------------------------------------------------------------- |
| `mediaIds`     | string[] | Yes      | 1 to 250 ids                                                            |
| `action`       | number   | No       | `0` adds (the default), `1` removes                                     |
| `collectionId` | number   | No       | Scopes to that collection's rule group. **Omit for a global exclusion** |
| `context`      | object   | No       | Narrows a one-item selection. Only allowed with exactly one id          |

Response:

```json
{ "results": [{ "mediaId": "12345", "code": 1 }] }
```

One entry per unique id, in first-appearance order. Possible failure messages include `Failed - no rule group`, `Failed - no metadata`, `Failed - media server unreadable`, `Failed - see server logs`, `Excluded, but not removed from the collection` and `Excluded, but not removed from every collection`.

| Status | Cause                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `201`  | Processed. Per-item outcomes are in the body                                                                                                |
| `400`  | Empty list, more than 250 ids, a blank id, a bad `collectionId` or `action`, or a `context` with more than one id. **Nothing is processed** |
| `409`  | The 30-second wait for the execution lock expired. Adds only                                                                                |
| `500`  | No media server type configured, or a metadata read on the add path threw                                                                   |
| `503`  | Credentials are not saved, the adapter failed to start, or a switch is in progress                                                          |

:::warning Destructive
**An add does two things**: it writes the exclusion **and removes the item from the collection**, in that order, so a failed exclusion never silently removes anything.

With no `collectionId` the add is global and removes the items from **every** collection, clearing manual membership as well as rule-added membership.

Exclusion rows and collection membership are affected, along with Radarr and Sonarr protective tags. Media files are never deleted and nothing is removed from your library.
:::

Removing an exclusion also picks up rows whose `parent` matches, which is how a cascaded show exclusion is fully cleared. A scoped removal skips rows belonging to a different rule group.

The 250 cap applies to one request. The web UI sends 25 at a time, so only direct API callers reach it.

### `DELETE /api/rules/exclusion/{id}`

**Delete one exclusion row by its database id.**

| Parameter | Type    | Required | Description                                       |
| --------- | ------- | -------- | ------------------------------------------------- |
| `id`      | integer | Yes      | Exclusion row id, from `GET /api/rules/exclusion` |

| Status               | Cause                                                      |
| -------------------- | ---------------------------------------------------------- |
| `200` with `code: 1` | Deleted. **A row that did not exist also reports success** |
| `200` with `code: 0` | Something failed                                           |
| `400`                | `id` is not an integer                                     |

:::warning Destructive
Removing an exclusion re-exposes the item to its rule group. The next run can add it back to the collection and **start its delete-after countdown**.

The protective Radarr or Sonarr tag may also be removed, but only when no exclusion for that item remains.
:::

This deletes exactly one row. An exclusion that cascaded from a show to its seasons and episodes is only partially removed. Use the route below or the bulk route to clear the whole cascade.

### `DELETE /api/rules/exclusions/{mediaServerId}`

**Delete every exclusion for one media item and all of its children.**

| Parameter       | Type   | Required | Description                         |
| --------------- | ------ | -------- | ----------------------------------- |
| `mediaServerId` | string | Yes      | Media server item id. Not validated |

| Status               | Cause                                                                              |
| -------------------- | ---------------------------------------------------------------------------------- |
| `200` with `code: 1` | Deleted                                                                            |
| `200` with `code: 0` | `Failed - no metadata`, or a delete threw                                          |
| `500`                | The metadata read or the child walk threw, or no media server is configured        |
| `503`                | Credentials are not saved, the adapter failed to start, or a switch is in progress |

:::warning Destructive: this is the widest un-exclude
It deletes every exclusion for the item **and every descendant**, in **every scope**. Global rows and every rule group's rows go together.

One call can therefore drop protections that several different rule groups rely on, re-arming all of them to re-collect the item and eventually act on it. **This cannot be undone**, and unlike the other exclusion routes it writes **no collection log entry**, so the collection's history shows no trace of it.

The protective Radarr and Sonarr tags are removed from every configured instance too.
:::

## Rule editor data

### `GET /api/rules/constants`

**Return the catalogue of applications and their comparable properties.**

This is what fills the rule editor's dropdowns. Applications the install cannot use are filtered out based on saved settings only. Reachability is never probed.

The response is an `applications` array. Each application has `id`, `name`, `mediaType` and `props`, and each property has `id`, `name`, `humanName`, `mediaType`, a `type` describing the comparisons it supports, and optionally `showType`.

| Status | Cause                    |
| ------ | ------------------------ |
| `200`  | The catalogue            |
| `500`  | The settings read failed |

Filtering is by configuration: Seerr needs a URL and API key, each `*arr` needs a saved instance, Tautulli needs a URL and API key **and** a Plex server, Streamystats needs a URL, the Jellyfin API key **and** a Jellyfin server, and Tracearr needs a URL, API key and server id.

:::caution The media server applications are never filtered
Plex, Jellyfin and Emby all come back regardless of which one is configured, and on a fresh install with no settings row **nothing at all** is filtered.

The web UI narrows the list itself. A different API client that trusts this list verbatim will offer properties its server cannot answer.
:::

### `GET /api/rules/users`

**List the media server usernames a per-user rule can be scoped to.**

Response is a sorted, deduplicated array of strings.

| Status | Cause                                     |
| ------ | ----------------------------------------- |
| `200`  | The usernames, **or `[]` on any failure** |

An empty array is ambiguous: no users, no media server configured, a switch in progress, missing credentials, or the account list could not be read.

On Plex these are deliberately the plex.tv spellings rather than the local account names, because that is the only naming the media server and Tautulli agree on. If plex.tv is unreachable, Plex returns `[]` rather than the wrong local names, on purpose.

## Import and export

### `POST /api/rules/migrate`

**Rewrite imported rules to target the configured media server.**

Request body:

```json
{ "rules": "[{\"action\":0,\"firstVal\":[0,1],\"section\":0}]" }
```

`rules` is a **JSON-encoded string**, not an array.

| Status | Cause                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------- |
| `201`  | Always. `code: 1` with the migrated array as a JSON string in `result`, or `code: 0` with `Invalid input` |

Properties specific to one media server are remapped to the equivalent on the target. A rule whose property has no equivalent is dropped and counted as skipped. Section operators are preserved so a dropped rule cannot flip a section between AND and OR.

Skipped rules are not reported in the body. Compare the input and output array lengths to detect them.

Non-media-server applications, such as the `*arr`s, Seerr, Tautulli and Tracearr, are never touched. Nothing is saved.

### `POST /api/rules/yaml/encode`

**Serialise a set of rules to the shareable YAML format.**

Request body:

```json
{ "rules": "[]", "mediaType": "movie" }
```

`rules` is a JSON-encoded string.

| Status | Cause                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| `201`  | Always. `code: 1` with the YAML in `result` and a `skipped` count, or `code: 0` with `Invalid input` or an export failure |

`skipped` counts rules dropped because their property does not exist on this build or server, so an export can be quietly incomplete. Always check it.

### `POST /api/rules/yaml/decode`

**Parse a YAML rule export back into rule objects for the configured server.**

Request body:

```json
{ "yaml": "...", "mediaType": "movie" }
```

`mediaType` must match the document's own media type.

| Status | Cause                                                                                                                                                                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `201`  | Always. `code: 1` with the decoded rules as a JSON string and a `skipped` count, or `code: 0` with `Yaml import failed. Incompatible media types.`, `Validation failed - Please check your YAML structure.`, or `Failed to import rules` |

A rule whose property identifier cannot be resolved is skipped rather than failing the import, and the decoded rules are then migrated to the configured server. `skipped` merges both counts, so success does not mean the whole document survived.

The decoded rules are not checked against the save validation, so an import can still be rejected by the create or update route afterwards.

## Community rules

These routes talk to the public community rule service shared by every Maintainerr install.

### `GET /api/rules/community`

**Fetch the shared community rule list.**

| Status                   | Cause                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `200`                    | An array of community rules                                                                     |
| `200` with `code: 0`     | The service was unreachable or errored. **The body shape changes from an array to an envelope** |
| `200` with an empty body | The service answered but the payload had no rules                                               |

:::caution Three different body shapes on one status code
Success, failure and an unexpected payload are all `200` with different bodies. Always check `Array.isArray()` before treating the response as a list.

There is no timeout on the outbound request, so an unresponsive community host can hold your request open for a long time across several retry attempts. Nothing is cached, so every call goes out to the network.
:::

### `GET /api/rules/community/count`

**Return how many rules the community list holds.**

The response is a bare number as **plain text**, not JSON.

| Status | Cause                            |
| ------ | -------------------------------- |
| `200`  | The count, or `0` on any failure |

`0` means either "no community rules" or "the fetch failed", with no way to tell them apart.

There is no upstream count endpoint, so this downloads the entire list to measure it. Fetching the count costs exactly as much as fetching the list.

### `POST /api/rules/community`

**Publish a rule set to the public community rule list.**

Request body needs `name`, `description` and `JsonRules`. Nothing is validated, so extra fields are forwarded to the community service as-is.

| Status | Cause                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `201`  | Always. `code: 1` with `Success`, or `code: 0` with `Invalid input`, `Connection failed`, `Name already exists`, or `Saving community rule failed` |

:::warning Publishes publicly and permanently
The rule is appended to a list **visible to every Maintainerr install**, and there is no delete or edit endpoint. It cannot be removed through this API.

Every `username` in the submitted rules is stripped before publishing, because a per-user rule names an account in your own household that would not resolve anywhere else.
:::

The duplicate-name check reads before it writes with no locking, so two installs racing on the same name can both succeed. The generated id is the list length at the time, so it is not a stable identifier.

### `POST /api/rules/community/karma`

**Vote on a community rule's karma, once per rule per install.**

Request body:

```json
{ "id": 12, "karma": 6 }
```

`karma` is the **absolute new value**, not a change. The UI computes it as the current karma plus or minus one.

| Status | Cause                                                                                                                                                                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `201`  | Always. `code: 1` with `Success`, or `code: 0` with `Invalid input`, `Connection failed`, `Rule not found`, `Already updated Karma for this rule`, or an update failure. Above `990` you get `code: 1` and `Success, but Max Karma reached for this rule.` with nothing written |

Because karma is absolute, a client sending a stale base value overwrites whatever other installs have voted since.

The one-vote-per-rule guard is local only, so the same rule can be voted on again from another install or after the database is reset.

### `GET /api/rules/community/karma/history`

**List which community rules this install has already voted on.**

Response:

```json
[{ "id": 1, "community_rule_id": 12 }]
```

| Status | Cause                                      |
| ------ | ------------------------------------------ |
| `200`  | The vote markers, empty on a fresh install |
| `500`  | The database read failed                   |

Despite the name this is not a ledger. There is no score, no timestamp and no rule name, only a record that a vote happened, used to stop a second vote on the same rule.
