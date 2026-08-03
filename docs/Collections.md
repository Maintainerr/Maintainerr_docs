---
id: collections
slug: /collections
description: Information about collection generation, media server syncing, and manual actions.
title: Collections
---

A collection is auto generated when defining a rule. A collection holds all media that either got picked up by the handling of the corresponding rule or got manually added.

When the specified amount of days that media must live in the collection is passed, the collection handler job will perform the necessary cleanup actions.

:::note Collection Handling
Collection handling is a batch process that runs every 12 hours. You can manually trigger it with the `Handle Collections` button on the Collections page.
This runs each collection's configured action (such as delete, unmonitor, or do nothing), but it does not remove items from collections on its own.

     If a rule-managed item is still in the collection but its most recent rule evaluation failed, Maintainerr skips the automatic handling action for that item until the rule can be evaluated cleanly again. Manually added items are still eligible for handling.
     When a delete-style action removes files, Maintainerr also prunes that media from any other Maintainerr-managed collections that still list it. This prevents already-deleted items from being re-processed while Jellyfin or Emby are still catching up on their next library scan.
     If eligible media is actively being streamed, Maintainerr defers it to the next collection-handler run instead of acting on it mid-playback. This is a best-effort snapshot taken once per run, so playback that starts later is only protected on the following pass.

:::

## Media Server

A collection will be reflected in your media server when it contains media. When no media is present, there's no use of having it in your media server. The collection's title and description will be the same as the one in Maintainerr.

If the `Show on home` option was checked, the collection will be shown on all users' home screens. This allows you to create, for instance, a 'Leaving soon' list.

## Collection items sort

When Plex is your configured media server, the rule group or collection form can also save a `Collection items sort` value for Maintainerr-managed collections.

- This is a Plex-only feature. Jellyfin and Emby do not expose a safe collection reorder API, so the sort control is not available there.
- `Default (no custom sort)` leaves the collection order alone.
- Custom sort options include title, air date or release date, rating, watch count, manual items first, excluded items first, and delete soonest or latest.
- Saving a new or changed sort applies it to Plex immediately; you do not need to wait for the next collection add cycle.
- Air date / release date, rating, watch count, and delete soonest / latest sorts break ties by title so Plex keeps the same order you see in Maintainerr.
- `Manual items first` and `Excluded items first` only partition those flagged items to the front; within each group Maintainerr preserves the current relative order.

:::note
Turning the custom sort back off does not restore Plex's previous order automatically. If you want the old order back, change it directly in Plex.
:::

## Calendar and overlays

Collections power additional Maintainerr views beyond cleanup.

- The [Calendar](./Calendar.md) page shows when collection media is scheduled to reach its configured action date.

For overlay setup and behavior, see [Overlays](./Overlays.md).

## Custom Poster

Maintainerr can store one custom poster per Maintainerr-managed collection and push it to the current media server. The stored file survives normal collection recreation, so you don't need to re-upload artwork after Plex, Jellyfin, or Emby drops a collection and Maintainerr creates it again.

The poster picker is available in the rule group's edit modal once the collection exists in Maintainerr.

- Uploads accept JPEG, PNG, or WebP up to 500 KB. The image is normalized to JPEG before being stored.
- The poster is pushed to the media server immediately on upload when the collection has a live media-server id. If the live push fails or the collection has no live id yet, the local file is still kept and pushed automatically when Maintainerr next recreates the collection.
- Clearing a poster removes Maintainerr's stored file and sends a best-effort metadata refresh request to the media server. Whether the server replaces the artwork depends on its configured metadata/image agents.
- Deleting a Maintainerr collection also removes its stored poster file.
- If you switch media servers with `migrateRules: true`, Maintainerr keeps the same collection ids, so stored posters stay mapped correctly and are pushed again when the recreated collection gets its new live media-server id.
- If you switch media servers with `migrateRules: false`, Maintainerr deletes those collections and removes their stored poster files as part of the cleanup.

:::note One-shot writer
Maintainerr writes the poster on upload and on collection recreation, then stops. It does not poll or reapply on a schedule, so it won't fight other artwork tools (e.g. Kometa, Posterizarr) or manual changes made directly in Plex, Jellyfin, or Emby after the upload.

:::

### Poster API behavior

The collection-poster endpoints live under `/api/collections/:id`.

- `GET /poster` returns the stored JPEG when a custom poster exists, or `404` when none has been saved yet
- `POST /poster` accepts a multipart upload with file field `poster` and returns `{ pushed, attempted }`
- `DELETE /poster` returns `{ cleared, refreshRequested }`

`attempted: false` means Maintainerr saved the poster locally but did not try a live media-server upload because the collection had no live media-server id yet, or the current media server was unavailable. `refreshRequested` only reports whether Maintainerr sent the best-effort metadata refresh request after clearing the poster; it does not guarantee that the media server will replace the artwork.

## Manual actions

### Adding

You can manually add media to a collection on the `Overview` page, by using the `Add` button on the media. Using the button will open a popup where you are able to pick the collection you wish to add the media to.

:::warning
Please note that the first option selected is to **remove** media from all collections. However, if the media was added by the rule handler, it will be added again. If you wish to counter this behaviour, you must also exclude it from all collections.
:::

### Removing

As mentioned in the section above, you are able to remove media from all collections using the `Add` popup on the `Overview` page by choosing the `Remove from all collections` option.

However, if you wish to just remove media from 1 collection it's easier to click on the collection's name on the `collections` page. This will show all media currently added to the collection. There you're able to remove specific media from the collection by using the `Remove` button.

:::note
This will also exclude media from rule handling for this collection, so it won't be added again.
:::

### Postponing deletion

Use `Postpone` from an item's collection details to delay its scheduled action by a whole number of days. If the item is already overdue, the delay is counted from today, so the next collection-handler run will not act on it immediately.

### Excluding

You're able to exclude media from all, or specific, collections by using the `Excl` button on the media's card from the `Overview` page. This will open a similar popup as adding media.

Here you're able to remove the media's current exclusions, exclude for all collections or exclude for a specific collection.

An exclusion tied to one specific collection / rule group only applies there. Other rule groups can still add or act on the same item unless you exclude it globally.

When media has exclusions, an `Excl` badge will be shown on the top-right side of the card.

Collections also have a dedicated `Exclusions` view. Open a collection, then switch to the `Exclusions` tab to review everything excluded from that collection, sort the list, and open the same media test flow from the collection context.

On a collection's media page, the `Remove` action also manages collection-level exclusions:

- removing an item from a collection creates an exclusion for that collection so rules do not immediately add it back
- if the item is already excluded for that collection, the same control removes that exclusion instead
- removing a global exclusion shows a warning because it affects every collection, not just the one you are viewing

Adding a global exclusion removes that item's existing collection-specific exclusions. If you later remove the global exclusion, those narrower exclusions are not restored automatically.

If you enable [exclusion tagging](./Configuration.md#exclusion-tag) for Radarr or Sonarr, excluding an item also applies a protective tag to the matching movie or series so your \*arr instance knows not to touch it. This covers both global and collection-scoped exclusions.

If you open the media details modal, Maintainerr also shows where the item is excluded from. That modal is informational for exclusions; you still manage exclusion changes from the card actions or the collection views.

For collection items that are still eligible for action, the media details modal also shows a `Trigger Rule Action` button.

- it runs the collection's configured action for that single item immediately instead of waiting for the normal collection schedule
- the confirmation dialog tells you which action will run, such as delete, unmonitor, or change quality profile
- on success, the item is removed from the collection right away

This button is only shown when the collection has a real action configured and the item is not already excluded or manually added.

### Bulk exclusions

From the Overview page you can switch into selection mode to exclude multiple items at once. Enable selection mode with the toggle in the action bar, then check the items you want to exclude. Once you have a selection, choose either **Exclude globally** or **Exclude from collection** from the bulk actions bar.

- **Exclude globally** excludes every selected item from all collections.
- **Exclude from collection** excludes every selected item from the collection currently shown in the filter.

Excluding a show or season also marks its visible child items (seasons or episodes) as excluded in the current view.

Up to 250 items can be excluded in a single bulk operation.

### Data syncing from media server

If media is added to the collection outside of Maintainerr, it will be added to the associated Maintainerr collection. These manually added items will be ignored by the rule processor. This is separate from the `Custom collection` option, which controls whether Maintainerr owns the collection itself.

If you delete media from the collection outside of Maintainerr, it will be removed from the corresponding Maintainerr collection. However, if the media still matches your rules, it will be re-added to the collection in subsequent rule processing cycles.

### MANUAL membership badge

An item shows a **MANUAL** badge when its membership source is manual: it was added by hand in the UI, or it was adopted from a media-server collection whose contents the rule does not own.

A few things to know about MANUAL items:

- Rules never evict a manual member. A manual item stays in the collection even when it stops matching the rule criteria.
- **MANUAL does not mean protected.** When the `Media deleted after days` timer expires, the collection handler acts on the item exactly as it would for a rule-owned item. Manual membership only describes how the item entered the collection, not whether it is exempt from the configured action.
- To make an item rule-owned again, remove it from the collection and re-run the rule. If the item still matches, the next rule run re-adds it as a rule-owned member. Adding the item by hand keeps it MANUAL.

## Leftover folder cleanup

When Radarr or Sonarr deletes an item's files one at a time (rather than deleting the whole entity), the parent folder and its sidecars (subtitles, .nfo, artwork) are left on disk. The **Clean up leftover folders** option (BETA) makes Maintainerr remove that stranded folder after the \*arr action completes.

This is off by default and opt-in per collection. It only appears in the collection form when the selected action actually strands a folder.

### Which actions offer the cleanup

The rule comes from `leftoverCleanupScope` in `packages/contracts/src/collections/leftover-cleanup.ts`, which is the single definition shared between the UI and the server. Only per-file deletes strand a folder; whole-entity deletes (`DELETE /movie/{id}`, `DELETE /series/{id}`) remove the folder in the \*arr itself, so no cleanup is needed or offered for those.

| Rule type | Action                                                     | Cleanup offered?                                 |
| --------- | ---------------------------------------------------------- | ------------------------------------------------ |
| Movie     | Unmonitor and delete files                                 | yes - removes the movie folder                   |
| Show      | Unmonitor show + seasons, delete all episodes              | yes - removes the series folder                  |
| Show      | Unmonitor show, delete existing episodes                   | yes - removes the series folder                  |
| Season    | Unmonitor and delete season                                | yes - removes the season folder                  |
| Season    | Unmonitor and delete season + delete show if empty         | yes - removes the season folder                  |
| Season    | Unmonitor and delete existing episodes                     | yes - removes the season folder                  |
| Movie     | Delete                                                     | no - Radarr removes the folder itself            |
| Show      | Delete entire show                                         | no - Sonarr removes the folder itself            |
| Episode   | Unmonitor and delete episode                               | no - season folder is shared with other episodes |
| Any       | Unmonitor and keep files / Unmonitor season and keep files | no - no files are deleted                        |

### Mount requirement

:::warning
The cleanup **requires** the media library to be bind-mounted into the Maintainerr container at the **identical path** that the \*arr reports in its `/api/v3/rootfolder` response.

- The mount must be read-write.
- The configured `user:group` must be able to write to the mount.
- Mounting the same data at a different container path does not work: Maintainerr checks the paths the \*arr reports, and a different container path will not match.

When the paths do not match, Maintainerr logs:

```
None of the *arr root folders are visible to Maintainerr for 'Some Movie'; mount the library at the same path the *arr uses. Skipping.
```

`Some Movie` is the affected item's title.

If you see this message, check that the host path and the container path are both identical across your Radarr/Sonarr and Maintainerr service definitions.
:::

For a Compose example with the optional media-library bind mount, see the [Docker installation instructions](./Installation.mdx#docker). The media-library `source` and `target` must use the same container path that Radarr or Sonarr reports for its root folder.

### Cleanup safety gates

Maintainerr applies several checks before removing a folder:

- The folder must be inside one of the \*arr's configured root folders.
- At least one of the files the \*arr just deleted must have lived inside the folder (prevents removing an unrelated same-named directory).
- The folder must not contain a media file or an unrecognized file type - only recognized sidecars (.srt, .nfo, .jpg, etc.) and OS junk files (.DS\_Store, Thumbs.db) may remain. A dangling symlink is also treated as a leftover and removed; a live symlink or one whose status cannot be confirmed keeps the folder.
- The folder must not be at or above another tracked item's folder.
- The folder itself must not be a symlink.
- For a season, the folder must be strictly under the series folder; seasonFolder=off layouts are skipped.
- Cleanup bypasses the \*arr's Recycle Bin: sidecars it removes are deleted outright, not recycled.

These checks are fail-closed: when in doubt, Maintainerr leaves the folder in place.

### Deletes that go through the media server

Maintainerr deletes through the media server in two cases: when no \*arr is configured for the collection, and when an \*arr is configured but does not track the item. In both cases the leftover-folder cleanup does not run - every fence it needs (root folders, the paths just deleted, the other tracked items' folders) comes from the \*arr. When the option is enabled, Maintainerr logs a line saying the cleanup does not apply.

That is not a gap for Jellyfin and Emby, because they already remove the folder themselves. Deleting an item deletes its containing folder, recursively, sidecars and extras included - not just the media file. In a mixed-folder library (several movies sharing one folder) they delete only the file, which is also correct, because the folder still holds the other movies.

Plex is not covered: Maintainerr does not clean up after a Plex media-server delete, and makes no claim about what Plex leaves behind.

## Misc

- By clicking on the collection's name you can see all media currently added to the collection. On the top-right side there'll be a number indicating the number of days before removal.

- Maintainerr will never remove the collection from your media server if you enabled the `Custom collection` option.

- Collections with `Do nothing` are not shown on the [Calendar](./Calendar.md) page because they do not schedule a cleanup action.
