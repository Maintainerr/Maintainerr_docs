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
:::

## Media Server

A collection will be reflected in your media server when it contains media. When no media is present, there's no use of having it in your media server. The collection's title and description will be the same as the one in Maintainerr.

If the `Show on home` option was checked, the collection will be shown on all users' home screens. This allows you to create, for instance, a 'Leaving soon' list.

## Collection items sort

When Plex is your configured media server, the rule group or collection form can also save a `Collection items sort` value for Maintainerr-managed collections.

- This is a Plex-only feature. Jellyfin does not expose a safe collection reorder API, so the sort control is not available there.
- `Default (no custom sort)` leaves the collection order alone.
- Custom sort options include title, air date or release date, rating, watch count, manual items first, excluded items first, and delete soonest or latest.
- Saving a new or changed sort applies it to Plex immediately; you do not need to wait for the next collection add cycle.
- Air date / release date, rating, watch count, and delete soonest / latest sorts break ties by title so Plex keeps the same order you see in Maintainerr.
- `Manual items first` and `Excluded items first` only partition those flagged items to the front; within each group Maintainerr preserves the current relative order.

:::note
Turning the custom sort back off does not restore Plex's previous order automatically. If you want the old order back, change it directly in Plex.
:::

## Calendar and overlays

Collections now power additional Maintainerr views beyond cleanup.

- The [Calendar](./Calendar.md) page shows when collection media is scheduled to reach its configured action date.
- Overlay-enabled collections can apply poster or title card artwork to help identify queued media in your media server.

In the rule or collection form, you can enable overlays per collection and optionally choose a specific overlay template. Movies, shows, and seasons use poster templates. Episode collections use title card templates.

## Custom Poster

Maintainerr can store one custom poster per Maintainerr-managed collection and push it to the current media server. The stored file survives normal collection recreation, so you don't need to re-upload artwork after Plex or Jellyfin drops a collection and Maintainerr creates it again.

The poster picker is available in the rule group's edit modal once the collection exists in Maintainerr.

- Uploads accept JPEG, PNG, or WebP up to 500 KB. The image is normalized to JPEG before being stored.
- The poster is pushed to the media server immediately on upload when the collection has a live media-server id. If the live push fails or the collection has no live id yet, the local file is still kept and pushed automatically when Maintainerr next recreates the collection.
- Clearing a poster removes Maintainerr's stored file and sends a best-effort metadata refresh request to the media server. Whether the server replaces the artwork depends on its configured metadata/image agents.
- Deleting a Maintainerr collection also removes its stored poster file.

:::note One-shot writer
Maintainerr writes the poster on upload and on collection recreation, then stops. It does not poll or reapply on a schedule, so it won't fight other artwork tools (e.g. Kometa, Posterizarr) or manual changes made directly in Plex or Jellyfin after the upload.

:::

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

### Excluding

You're able to exclude media from all, or specific, collections by using the `Excl` button on the media's card from the `Overview` page. This will open a similar popup as adding media.

Here you're able to remove the media's current exclusions, exclude for all collections or exclude for a specific collection.

When media has exclusions, an `Excl` badge will be shown on the top-right side of the card.

Collections also have a dedicated `Exclusions` view. Open a collection, then switch to the `Exclusions` tab to review everything excluded from that collection, sort the list, and open the same media test flow from the collection context.

On a collection's media page, the `Remove` action also manages collection-level exclusions:

- removing an item from a collection creates an exclusion for that collection so rules do not immediately add it back
- if the item is already excluded for that collection, the same control removes that exclusion instead
- removing a global exclusion shows a warning because it affects every collection, not just the one you are viewing

If you open the media details modal, Maintainerr also shows where the item is excluded from. That modal is informational for exclusions; you still manage exclusion changes from the card actions or the collection views.

For collection items that are still eligible for action, the media details modal also shows a `Trigger Rule Action` button.

- it runs the collection's configured action for that single item immediately instead of waiting for the normal collection schedule
- the confirmation dialog tells you which action will run, such as delete, unmonitor, or change quality profile
- on success, the item is removed from the collection right away

This button is only shown when the collection has a real action configured and the item is not already excluded or manually added.

### Data syncing from media server

If media is added to the collection outside of Maintainerr, it will be added to the associated Maintainerr collection. These manually added items will be ignored by the rule processor.

If you delete media from the collection outside of Maintainerr, it will be removed from the corresponding Maintainerr collection. However, if the media still matches your rules, it will be re-added to the collection in subsequent rule processing cycles.

## Misc

- By clicking on the collection's name you can see all media currently added to the collection. On the top-right side there'll be a number indicating the number of days before removal.

- Maintainerr will never remove the collection from your media server if you specified a manual collection through the `Custom collection` option.

- Collections with `Do nothing` are not shown on the [Calendar](./Calendar.md) page because they do not schedule a cleanup action.
