---
slug: /api/overlays
title: Overlays API
description: Overlay settings, processing runs, templates, fonts, images and previews.
---

Everything behind the overlay feature: the global switch and schedule, the runs that burn artwork onto your media server, the template editor's data, and the font and image assets templates draw with. See the [Overlays](../Overlays.md) page for what the feature does.

See [API conventions](../API.md#api-conventions) for the rules that apply across the API.

:::note Every route here needs a configured media server
The whole controller is behind the media server setup check, so **all** of these answer `403 Forbidden resource` when no media server type is set, or when the selected type's credentials are incomplete.

That includes the routes that only touch local disk, such as listing fonts, and the purely diagnostic status route. On a fresh install the overlay editor cannot load anything until setup is done. The check reads stored settings only and never contacts the server, so a configured but unreachable server still passes.
:::

To keep the tables short, that `403` is listed once here rather than repeated on all 28 endpoints below.

## How reverting works

Before Maintainerr overlays an item for the first time it saves the untouched artwork to a backup directory. A revert or a reset re-uploads that backup.

:::caution A revert restores the backup, not the original source
It puts back exactly the bytes captured before the first overlay was applied. That means artwork you changed by hand **after** an overlay was applied is overwritten by the older backup.

If the backup file is lost, the item stays overlaid forever. Maintainerr clears its tracking and reports nothing to restore.
:::

## Settings

### `GET /api/overlays/settings`

**Return the overlay settings.**

| Status | Cause                                                    |
| ------ | -------------------------------------------------------- |
| `200`  | The settings                                             |
| `500`  | The read, or the first-run write described below, failed |

The response carries `enabled`, `cronSchedule`, and six style blocks: `posterOverlayText`, `posterOverlayStyle`, `posterFrame`, `titleCardOverlayText`, `titleCardOverlayStyle` and `titleCardFrame`.

:::note The six style blocks are legacy
They are still stored and returned, but nothing reads them any more. Template-based rendering replaced them. Only `enabled` and `cronSchedule` still have an effect.
:::

This `GET` writes on a fresh install: if the settings row does not exist yet it is created from defaults before the response is built.

### `PUT /api/overlays/settings`

**Update overlay settings and reschedule the overlay cron job.**

Every field is optional, and omitted fields keep their stored value.

```json
{ "enabled": true, "cronSchedule": "0 4 * * *" }
```

| Status | Cause                                                      |
| ------ | ---------------------------------------------------------- |
| `200`  | Written. The body is the full re-read settings object      |
| `400`  | Validation failed                                          |
| `500`  | **An empty JSON object `{}`**, or a database write failure |

Sending `enabled` or `cronSchedule` also retimes the overlay job. Anything else parks it so it never runs.

:::caution Two traps
An empty body `{}` is a `500`, not a no-op, because there is nothing to update.

`cronSchedule` is stored **without any syntax validation**, and an invalid expression is worse than it looks: the job is stopped before the new schedule is parsed, so a bad expression stops the job and never restarts it. The request still returns `200`, and scheduled overlay runs stay stopped until you save a valid expression or restart the server.
:::

The style blocks are top-level partial only. If you send one, send it complete.

Setting `enabled: false` does not remove any overlay already applied. Artwork stays overlaid until a revert or a reset.

## Processing

### `GET /api/overlays/status`

**Report the overlay processor's current state and last run summary.**

Response:

```json
{
  "status": "idle",
  "lastRun": "2026-06-05T04:00:00.000Z",
  "lastResult": { "processed": 12, "reverted": 0, "skipped": 3, "errors": 0 }
}
```

`status` is `idle`, `running` or `error`.

| Status | Cause                               |
| ------ | ----------------------------------- |
| `200`  | The status. The handler cannot fail |

This is the completion signal for the two fire-and-forget routes. Poll it until `status` is no longer `running`.

:::caution Three things this does not tell you
A run that returned early, because overlays are disabled or no provider is available, still stamps a fresh `lastRun` and an all-zero `lastResult`. Nothing distinguishes "skipped" from "clean pass".

A single-collection run or a revert flips `status` to `running` but **never updates** `lastRun` or `lastResult`, so a poller can see `running` followed by a stale summary.

`status` returns to `idle` after a failed reset too. Only `lastResult.errors` records that items could not be restored.
:::

All of this state is in memory and resets on restart.

### `POST /api/overlays/process`

**Start a full overlay run across every overlay-enabled collection.**

Request body:

```json
{ "force": true }
```

`force` is optional and defaults to `false`. Setting it re-renders every item even when nothing about it changed, which is what you want after editing a template or its styling.

| Status | Cause                                      |
| ------ | ------------------------------------------ |
| `202`  | The run was **started**. The body is empty |
| `400`  | `force` is not a boolean                   |
| `409`  | `An overlay run is already in progress`    |

:::warning Destructive to artwork
For every targeted item this **uploads a re-rendered image over the item's poster or still** on your media server, and re-uploads the saved original for items that dropped out of coverage.

It is reversible in principle, because every original is backed up first, but only as good as that backup. See [How reverting works](#how-reverting-works). No media files are touched.

On Plex nothing is deleted when a new poster is uploaded, so items accumulate uploaded posters over time.
:::

Only collections that actually delete on a schedule are targeted, meaning those with `deleteAfterDays` set and a delete-style action. A collection whose action only unmonitors, or does nothing, has its previous overlays reverted instead.

The run outlives the request, so a `202` only means it was accepted. Poll `GET /api/overlays/status`.

:::caution Two silent failure modes
Rendering needs the native image libraries. If they are unavailable, every item counts as an error, nothing is uploaded, and the backup taken on that pass is deleted again, so a later reset cannot restore it.

On Plex, selecting the newly uploaded poster can fail without being reported. The item is then counted as processed and a tracking row is written, while the visible poster never changed.
:::

There is a second interlock beyond the `409`: a run that cannot take the overlay lock is silently skipped **after** the `202` was already sent.

### `POST /api/overlays/process/{collectionId}`

**Run overlay processing for one collection and return its summary.**

Unlike the global route, this holds the request open for the whole run and returns the result.

| Parameter      | Type    | Required | Description               |
| -------------- | ------- | -------- | ------------------------- |
| `collectionId` | integer | Yes      | Maintainerr collection id |

Response:

```json
{ "processed": 12, "reverted": 0, "skipped": 3, "errors": 0 }
```

`reverted` is always `0` here. Only the global run performs the revert sweep.

| Status | Cause                                                                  |
| ------ | ---------------------------------------------------------------------- |
| `201`  | Run completed. The body is the summary                                 |
| `400`  | `collectionId` is not an integer                                       |
| `404`  | `Collection not found`                                                 |
| `409`  | An overlay run is already in progress                                  |
| `500`  | The run threw. Per-item failures do not throw, they increment `errors` |

:::warning Destructive to artwork
The same artwork overwrites as the global run, scoped to one collection. See [How reverting works](#how-reverting-works).
:::

There is no `force` option here, so items whose stored state still matches are skipped.

:::caution This ignores the collection's own overlay switch
It does **not** check the collection's `overlayEnabled` flag. A collection with overlays turned off still gets them applied, as long as it deletes on a schedule and the global switch is on.

If the overlay lock is held it answers `201` with an all-zero summary rather than a `409`.
:::

Neither `lastRun` nor `lastResult` is updated by this route, so the status route keeps showing the previous global run.

### `POST /api/overlays/revert/{collectionId}`

**Restore the original artwork for every item this collection overlaid.**

| Parameter      | Type    | Required | Description                                                                                      |
| -------------- | ------- | -------- | ------------------------------------------------------------------------------------------------ |
| `collectionId` | integer | Yes      | Maintainerr collection id. It does not have to exist: a missing one simply has nothing to revert |

| Status | Cause                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------- |
| `201`  | Revert performed, **or queued** behind a running overlay operation. The body is `{ "success": true }` |
| `400`  | `collectionId` is not an integer                                                                      |
| `500`  | Reading the tracking rows or the collection row threw                                                 |

:::warning Destructive to current artwork
Re-uploads each saved backup **over whatever the item currently shows**, then deletes the backup and stops tracking the item. Artwork you changed by hand after the overlay was applied is overwritten. See [How reverting works](#how-reverting-works).
:::

This never returns `409`. If another overlay operation is running, the work is queued rather than skipped, because otherwise an overlay could be left with nothing able to remove it.

:::caution `success: true` is not proof anything was restored
The response says success even when every item failed, and it carries no count and no indication of whether the work ran or was queued.

Each item ends in one of four states: restored, no backup so the item stays overlaid, gone from the server, or failed. A failed item deliberately keeps its backup and tracking row so a later run can retry. On Plex a swallowed failure can report a restore while the visible poster is still the overlaid one.
:::

### `DELETE /api/overlays/reset`

**Restore original artwork for every overlaid item on the server.**

| Status | Cause                                        |
| ------ | -------------------------------------------- |
| `202`  | The reset was **started**. The body is empty |
| `409`  | An overlay run is already in progress        |

:::warning Bulk destructive to current artwork
Re-uploads **every** saved backup over whatever those items currently show, across all collections. It also picks up orphaned backups that no tracking row claims, since those are the only remaining record that artwork may have been changed.

Backups are deleted as they are restored, and the tracking rows go with them. Artwork you changed by hand after an overlay was applied is overwritten by the older backup. See [How reverting works](#how-reverting-works).
:::

This deliberately still works while the overlay feature is globally disabled. It is the escape hatch for turning overlays off and getting your artwork back.

Items with no backup on disk are left overlaid. Items that fail to upload keep both their backup and their tracking row and are counted as errors.

Poll `GET /api/overlays/status` for the summary. On this path only `reverted` and `errors` move.

:::caution A reset with no provider looks clean
If there is no overlay provider the reset returns early but still stamps a fresh `lastRun` and an all-zero summary, so the status route shows what looks like a successful reset.
:::

## Templates

### `GET /api/overlays/templates`

**List every overlay template, presets and user templates alike.**

There is no filtering and no paging. Split poster from title card templates using each item's `mode`.

Each template carries `id`, `name`, `description`, `mode`, `canvasWidth`, `canvasHeight`, `elements`, `isDefault`, `isPreset`, `createdAt` and `updatedAt`.

| Status | Cause                    |
| ------ | ------------------------ |
| `200`  | The templates            |
| `500`  | The database read failed |

Four presets are seeded on first start: Classic Pill, Countdown Bar, Corner Badge and Title Card Pill. They cannot be updated or deleted, only duplicated, exported or made default. Seeding only happens when the table is empty and only at startup, so this never re-seeds.

Templates carry no media server binding and are shared across whichever server is configured.

Two templates of the same mode can briefly both be marked default. See the update route for how.

### `GET /api/overlays/templates/{id}`

**Fetch one overlay template by id.**

| Parameter | Type    | Required | Description |
| --------- | ------- | -------- | ----------- |
| `id`      | integer | Yes      | Template id |

| Status | Cause                    |
| ------ | ------------------------ |
| `200`  | The template             |
| `400`  | `id` is not an integer   |
| `404`  | `Template not found`     |
| `500`  | The database read failed |

`elements` comes back exactly as stored and is not re-validated, so a row edited directly in the database can return element shapes the write routes would have rejected.

### `POST /api/overlays/templates`

**Create a user template from a full template definition.**

Request body:

```json
{
  "name": "My template",
  "description": "",
  "mode": "poster",
  "canvasWidth": 1000,
  "canvasHeight": 1500,
  "elements": [],
  "isDefault": false
}
```

| Field                         | Type    | Required | Description                             |
| ----------------------------- | ------- | -------- | --------------------------------------- |
| `name`                        | string  | Yes      | 1 to 100 characters                     |
| `mode`                        | string  | Yes      | `poster` or `titlecard`                 |
| `canvasWidth`, `canvasHeight` | integer | Yes      | Positive                                |
| `elements`                    | array   | Yes      | May be empty                            |
| `description`                 | string  | No       | Up to 500 characters, defaults to empty |
| `isDefault`                   | boolean | No       | Defaults to `false`                     |

Each element is one of four types, all sharing `id`, `x`, `y`, `width`, `height`, `layerOrder`, and the optional `rotation`, `opacity` and `visible`.

- **`text`** adds `text`, `fontFamily`, `fontPath`, `fontSize`, `fontColor`, and optional `fontWeight`, `textAlign`, `verticalAlign`, `backgroundColor`, `backgroundRadius`, `backgroundPadding`, `shadow` and `uppercase`.
- **`variable`** has the same typography but replaces `text` with `segments`, a list of literal text parts and variable parts drawn from `date`, `days` and `daysText`. It also takes `dateFormat`, `language`, `enableDaySuffix`, `textToday`, `textDay` and `textDays`.
- **`shape`** adds `shapeType` of `rectangle` or `ellipse`, plus `fillColor`, `strokeColor`, `strokeWidth` and `cornerRadius`.
- **`image`** adds `imagePath`, a bare filename or an empty string meaning no source picked yet.

`fontPath` and `imagePath` must be bare safe filenames. Anything with a path separator is rejected.

| Status | Cause                                                                                 |
| ------ | ------------------------------------------------------------------------------------- |
| `201`  | Created. The body is the new template                                                 |
| `400`  | Validation failed                                                                     |
| `413`  | The body exceeds the JSON body limit. A template with very many elements can reach it |
| `500`  | The database write failed                                                             |

This can never create a preset. Setting `isDefault: true` clears the flag on every other template of the same mode.

### `PUT /api/overlays/templates/{id}`

**Update a user template. Presets are rejected.**

Every field is optional and omitted fields keep their stored value.

| Status | Cause                                        |
| ------ | -------------------------------------------- |
| `200`  | Updated. The body is the updated template    |
| `400`  | `id` is not an integer, or validation failed |
| `404`  | `Template not found or is a preset`          |
| `413`  | The body exceeds the JSON body limit         |
| `500`  | The database write failed                    |

The `404` conflates "no such template" with "this is a preset". You cannot tell which from the response.

:::caution Changing mode can leave two defaults
Other templates are only demoted when you explicitly send `isDefault: true`.

Change the `mode` of a template that is already the default while omitting `isDefault`, and it stays default in its new mode **without** clearing the existing default there. That mode then has two defaults. The tie is broken by most recently updated, and it is only tidied up on the next restart.
:::

Nothing is pushed to the media server. Artwork already overlaid is unaffected until the next run.

### `DELETE /api/overlays/templates/{id}`

**Permanently delete a user template. Presets are rejected.**

| Parameter | Type    | Required | Description |
| --------- | ------- | -------- | ----------- |
| `id`      | integer | Yes      | Template id |

| Status | Cause                                      |
| ------ | ------------------------------------------ |
| `200`  | Deleted. The body is `{ "success": true }` |
| `400`  | `id` is not an integer                     |
| `404`  | `Template not found or is a preset`        |
| `500`  | The database write failed                  |

:::warning Destructive
The template and its elements are permanently deleted. **There is no undo and no soft delete.** Export it first with the export route if you might want it back.

Collections pointing at it are not blocked from the delete. Their template reference is cleared and they fall back to the mode default on their next run.

Artwork already overlaid on your media server stays overlaid, and revert and reset still work, because those use the saved backups rather than the template.
:::

If the deleted template was the default for its mode, a replacement is promoted automatically, preferring a preset. Deleting the last template of a mode leaves it with no default at all, and collections in that mode then get no overlay.

### `POST /api/overlays/templates/{id}/default`

**Make one template the default for its own mode.**

Takes no request body. The mode comes from the stored template, so this only ever moves the default within poster or within title card.

| Status | Cause                                          |
| ------ | ---------------------------------------------- |
| `201`  | Default set. The body is the promoted template |
| `400`  | `id` is not an integer                         |
| `404`  | `Template not found`                           |
| `500`  | The database write failed                      |

Presets are allowed here. This is the only template change a preset accepts.

The default is what a collection falls back to when it has no template of its own, or points at one of the wrong mode. The change only takes effect on the next overlay run.

### `POST /api/overlays/templates/{id}/duplicate`

**Copy a template, preset or not, into a new editable user template.**

Takes no request body. The copy is named after the source with `(copy)` appended, and is always created as a non-preset, non-default template.

| Status | Cause                                 |
| ------ | ------------------------------------- |
| `201`  | Created. The body is the new template |
| `400`  | `id` is not an integer                |
| `404`  | `Template not found`                  |
| `500`  | The database write failed             |

This is the supported way to get an editable copy of a built-in preset. The source is not modified.

Duplicating repeatedly produces `X (copy) (copy)` and so on. The suffix is appended blindly with no length check.

### `POST /api/overlays/templates/{id}/export`

**Return a template as a portable, version-stamped JSON document.**

Takes no request body. Despite being a `POST`, this only reads.

Response:

```json
{
  "version": 1,
  "name": "My template",
  "mode": "poster",
  "canvasWidth": 1000,
  "canvasHeight": 1500,
  "elements": []
}
```

`description`, `id`, `isDefault`, `isPreset` and the timestamps are deliberately dropped.

| Status | Cause                                     |
| ------ | ----------------------------------------- |
| `201`  | Exported, even though nothing was created |
| `400`  | `id` is not an integer                    |
| `404`  | `Template not found`                      |
| `500`  | The database read failed                  |

This is plain JSON with no download headers. Presets export fine, which is the easiest way to fork one outside the app.

:::caution The export is not self-contained
Elements reference fonts and images by bare filename. A template moved to another install renders with a fallback typeface and silently skipped image layers until you upload the matching files there too.
:::

### `POST /api/overlays/templates/import`

**Import a previously exported template as a new user template.**

Send the exact document the export route produced. `version` must be exactly `1`.

| Status | Cause                                                      |
| ------ | ---------------------------------------------------------- |
| `201`  | Imported. The body is the new template                     |
| `400`  | `version` is not `1`, or any field or element is malformed |
| `413`  | The body exceeds the JSON body limit                       |
| `500`  | The database write failed                                  |

Import always creates. It never matches or updates an existing template by name, so repeated imports of the same file produce duplicates with identical names. The result always lands with an empty description, and as a non-default, non-preset template.

The import schema puts no maximum on `name`, while the create route caps it at 100 characters, so an import can produce a name longer than the create route would accept.

### `POST /api/overlays/templates/{id}/preview`

**Render a template over one item's real artwork and stream back the image.**

| Parameter | Type          | Required | Description                                                                            |
| --------- | ------------- | -------- | -------------------------------------------------------------------------------------- |
| `id`      | path, integer | Yes      | Template id                                                                            |
| `itemId`  | query         | **Yes**  | Media server item whose artwork is the background. Get one from the random item routes |

Returns `image/jpeg` bytes at the **source artwork's** pixel dimensions, not the template canvas dimensions.

| Status | Cause                                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| `201`  | The image. Note a successful render is `201`, not `200`                                                    |
| `400`  | `itemId` is missing or empty, or `id` is not an integer                                                    |
| `404`  | `Template not found`                                                                                       |
| `500`  | No overlay provider, **the item has no artwork**, the image libraries are unavailable, or rendering failed |

Date and day variables resolve to a fixed sample of 14 days, so the preview always shows the same countdown.

Nothing is uploaded and nothing is written to disk. A preview leaves nothing for a revert or reset to undo, and in particular it does **not** create a backup.

Note that "the item has no artwork" is a `500` here, not a `404`.

## Preview helpers

### `GET /api/overlays/sections`

**List the movie and show libraries usable as overlay preview sources.**

Response:

```json
[{ "key": "1", "title": "Movies", "type": "movie" }]
```

| Status | Cause                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------- |
| `200`  | The sections, possibly `[]`                                                                              |
| `503`  | `Overlays are not available right now.` when there is no overlay provider for the configured server type |

An empty array is ambiguous: it means either no movie or show libraries exist, or the library read failed. An unreachable media server produces `200` with `[]` rather than an error.

### `GET /api/overlays/random-item`

**Pick one random movie or show from a library section, for poster preview.**

| Parameter   | Type  | Required | Description                                                           |
| ----------- | ----- | -------- | --------------------------------------------------------------------- |
| `sectionId` | query | **Yes**  | A `key` from `GET /api/overlays/sections`. Only one value is honoured |

Response:

```json
{ "itemId": "12345", "title": "An example title" }
```

| Status | Cause                                                   |
| ------ | ------------------------------------------------------- |
| `200`  | An item, **or an empty body meaning nothing was found** |
| `400`  | `sectionId` is missing or empty                         |
| `503`  | No overlay provider for the configured server type      |

An unknown section id is not rejected. It simply matches nothing and gives you an empty body, as does an unreachable server.

On Plex, "random" means random among the first 50 items in the section that have artwork. Jellyfin and Emby let the server pick.

### `GET /api/overlays/random-episode`

**Pick one random episode from a show section, for title card preview.**

| Parameter   | Type  | Required | Description                                            |
| ----------- | ----- | -------- | ------------------------------------------------------ |
| `sectionId` | query | **Yes**  | A show library `key` from `GET /api/overlays/sections` |

Returns the same shape as the random item route, with the title formatted as the series name, a dash, then the episode name.

| Status | Cause                                                  |
| ------ | ------------------------------------------------------ |
| `200`  | An episode, or an empty body meaning nothing was found |
| `400`  | `sectionId` is missing or empty                        |
| `503`  | No overlay provider for the configured server type     |

Passing a movie section simply matches nothing. Jellyfin and Emby exclude unaired placeholder episodes. Plex samples only the first 50 rows.

### `GET /api/overlays/poster`

**Proxy an item's current artwork from the media server.**

A plain proxy so a browser can display media server artwork without holding a Plex token or an API key. No overlay is drawn.

| Parameter | Type  | Required | Description          |
| --------- | ----- | -------- | -------------------- |
| `itemId`  | query | **Yes**  | Media server item id |

| Status | Cause                                                                              |
| ------ | ---------------------------------------------------------------------------------- |
| `200`  | The artwork, cached by the browser for an hour                                     |
| `400`  | `itemId` is missing or empty                                                       |
| `404`  | `Poster not found`: the item has no artwork, does not exist, or the request failed |
| `500`  | Plex only: artwork was found but downloading it failed                             |
| `503`  | No overlay provider for the configured server type                                 |

:::caution Two things to know about the bytes
The response is always labelled `image/jpeg` regardless of what the server actually sent. Only Jellyfin is guaranteed to match, because the format is forced there. A Plex or Emby PNG is served labelled as JPEG.

It always returns what the media server holds **right now**, so for an already-processed item that is the overlaid poster, not the saved original. No route exposes the backups.
:::

## Fonts and images

Assets are stored on the server's data directory and referenced from templates by bare filename. Uploads are hardened against path traversal: a name like `../../evil.ttf` is reduced to `evil.ttf` inside the correct directory.

### `GET /api/overlays/fonts`

**List the font files available to the template editor.**

Merges an uploaded font directory with the bundled fonts, with uploads taking precedence on a name collision.

Response:

```json
[
  {
    "name": "Inter-Bold.ttf",
    "path": "/opt/data/overlays/fonts/Inter-Bold.ttf"
  }
]
```

| Status | Cause                                      |
| ------ | ------------------------------------------ |
| `200`  | The list, possibly empty                   |
| `500`  | The directory exists but could not be read |

Only `.ttf`, `.otf` and `.woff` are listed. `.woff2` is not supported, so such a file is invisible here and cannot be fetched. Files with unsafe names are hidden rather than offered and then rejected.

Seven fonts ship with Maintainerr: Comfortaa Bold, Inter Bold, Medium and Regular, and Roboto Bold, Medium and Regular.

### `POST /api/overlays/fonts`

**Upload a font file.**

Send `multipart/form-data` with a single file field named `font`. Accepted extensions are `.ttf`, `.otf` and `.woff`.

| Status | Cause                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------- |
| `201`  | Stored. The body is the sanitised name and path                                                   |
| `400`  | No file uploaded, an unsupported extension, an invalid filename, or the field is not named `font` |
| `500`  | The write failed                                                                                  |

:::warning Overwrites silently
A font with the same sanitised name is **overwritten with no warning and no backup**. Every template referencing that filename renders with the new file on the next run.
:::

:::caution No size limit on this route
Unlike the image route, there is no size cap here and the whole file is buffered in memory. The bytes are also never checked to be a real font. A bad file only shows up later as a warning during a run, after which text falls back to a default typeface.
:::

There is **no delete route for fonts**. An uploaded font can only be removed from disk by hand.

### `GET /api/overlays/fonts/{name}`

**Serve a single font file by filename.**

| Parameter | Type   | Required | Description                                                                              |
| --------- | ------ | -------- | ---------------------------------------------------------------------------------------- |
| `name`    | string | Yes      | A bare filename such as `Inter-Bold.ttf`. Letters, digits, dot, dash and underscore only |

| Status | Cause                                                                        |
| ------ | ---------------------------------------------------------------------------- |
| `200`  | The font, cached by the browser for an hour                                  |
| `400`  | `Invalid font name`, which is how path traversal is rejected                 |
| `404`  | `Font not found`, including a file that exists with an unsupported extension |

Uploaded fonts shadow bundled ones of the same name. Because the response is cached for an hour, add a changing query parameter after re-uploading the same filename to defeat the cache.

### `GET /api/overlays/images`

**List the overlay image assets.**

Response is the same `name` and `path` shape as the font list. Only `.png`, `.jpg`, `.jpeg` and `.webp` are listed, and only from the uploaded image directory. There are no bundled images.

| Status | Cause                                      |
| ------ | ------------------------------------------ |
| `200`  | The list, possibly empty                   |
| `500`  | The directory exists but could not be read |

### `POST /api/overlays/images`

**Upload an image asset for overlay image elements.**

Send `multipart/form-data` with a single file field named `image`.

| Requirement  | Value                                             |
| ------------ | ------------------------------------------------- |
| Extensions   | `.png`, `.jpg`, `.jpeg`, `.webp`                  |
| Maximum size | **500 KB**                                        |
| Content      | Must genuinely be the format the extension claims |

| Status | Cause                                                                                                                                               |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `201`  | Stored. The body is the sanitised name and path                                                                                                     |
| `400`  | No file, empty file, unsupported extension, not a valid image, contents that do not match the extension, an invalid filename, or a wrong field name |
| `413`  | The file exceeds 500 KB                                                                                                                             |
| `500`  | The write failed                                                                                                                                    |
| `503`  | The native image library is unavailable on this machine                                                                                             |

A PNG renamed to `.jpg` is rejected, so the file cannot later be served with a misleading content type.

:::warning Overwrites silently
An image with the same sanitised name is **overwritten with no warning and no backup**. This is a real in-place asset replacement.
:::

The asset only reaches posters on the next overlay run, which reads it back from disk.

### `GET /api/overlays/images/{name}`

**Serve a single image asset by filename.**

| Parameter | Type   | Required | Description                                                  |
| --------- | ------ | -------- | ------------------------------------------------------------ |
| `name`    | string | Yes      | A bare filename ending in `.png`, `.jpg`, `.jpeg` or `.webp` |

| Status | Cause                                            |
| ------ | ------------------------------------------------ |
| `200`  | The image, sent with `Cache-Control: no-cache`   |
| `400`  | `Invalid image name` or `Unsupported image type` |
| `404`  | `Image not found`                                |

The `400` and `404` split is deliberate: an unsafe or unsupported name never reaches the filesystem, so it is distinguishable from a genuine miss.

### `DELETE /api/overlays/images/{name}`

**Permanently delete an overlay image asset from disk.**

| Parameter | Type   | Required | Description                                                      |
| --------- | ------ | -------- | ---------------------------------------------------------------- |
| `name`    | string | Yes      | A bare filename. **No extension check is applied on this route** |

| Status | Cause                                                |
| ------ | ---------------------------------------------------- |
| `200`  | Deleted. The body is `{ "success": true }`           |
| `400`  | `Invalid image name`                                 |
| `404`  | `Image not found`                                    |
| `500`  | The delete failed, for example a permissions problem |

:::warning Destructive
Irreversibly removes the file from disk. **There is no undo and no trash.**

The delete is not checked against templates. Any template referencing the filename is left pointing at a file that no longer exists, and nothing warns you at delete time. The breakage only shows up at render, where the missing image element is silently dropped from the overlay.

Posters already burned with this image stay exactly as they are until the next run or reset.
:::

Unlike the list and fetch routes, no extension filter applies here, so any safely-named file in the image directory can be deleted through this route.
