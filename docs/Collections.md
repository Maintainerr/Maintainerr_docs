---
id: collections
slug: /collections
description: Information about collection generation, media server syncing, and manual actions.
title: Collections
---

A collection is created when you define a rule. A collection holds all media that was matched by that rule, along with anything you manually add to it.

When the configured number of days has passed, the collection handler job performs the cleanup actions tied to that collection.

:::note Collection Handling
Collection handling is a batch process that runs every 12 hours. You can manually trigger it with the `Handle collection` button on the Collections page.
:::

## Media Server Behavior

Collections exist inside Maintainerr first, and then get reflected to your configured media server where supported.

The collection title and description are based on the values configured in Maintainerr.

### Plex

- Plex collections are created when they contain media.
- If a collection becomes empty, Maintainerr removes the need for it to exist in Plex.
- If `Show on home` is enabled, the Plex collection can appear on users' home screens. This is useful for collections such as `Leaving soon`.

### Jellyfin

- Jellyfin support is available, but not every collection behavior maps one-to-one with Plex terminology or UI.
- Where the application behavior differs between media servers, Maintainerr's internal collection still remains the source of truth.

:::note
If you are using Jellyfin, expect collection behavior and presentation to depend on what Jellyfin currently supports for that media type and action flow.
:::

## Manual Actions

### Adding

You can manually add media to a collection from the `Overview` page by using the `Add` button on a media item. This opens a popup where you can choose which collection to add that item to.

:::warning
The first selected option is to **remove** media from all collections. However, if the media was added by the rule handler, it will be added again. If you want to prevent that behavior, you must also exclude it from all collections.
:::

### Removing

You can remove media from all collections using the same `Add` popup on the `Overview` page by choosing `Remove from all collections`.

If you only want to remove media from one collection, it is easier to click the collection name on the Collections page. That view shows all media currently in the collection, where you can remove a specific item with the `Remove` button.

:::note
Removing media from a collection in this way also excludes it from rule handling for that collection, so it will not be added again automatically.
:::

### Excluding

You can exclude media from all collections, or from specific collections, by using the `Excl` button on the media card from the `Overview` page.

That popup allows you to:

- remove the media's current exclusions
- exclude it from all collections
- exclude it from a specific collection

When media has exclusions, an `Excl` badge is shown on the top-right side of the card.

## Syncing With Your Media Server

Maintainerr can sync collection state with the configured media server.

### Plex Syncing

If media is added to a Plex collection outside of Maintainerr, it is added to the associated Maintainerr collection. These manually added items are ignored by the rule processor.

If media is removed from the Plex collection outside of Maintainerr, it is removed from the corresponding Maintainerr collection. However, if that media still matches your rules, it will be added again in a later rule processing cycle.

### Jellyfin Syncing

Jellyfin collection handling should be thought of in the same general way, but exact sync behavior may differ depending on current Jellyfin support in the application.

If you are documenting a specific Jellyfin edge case, call it out explicitly rather than assuming it behaves exactly like Plex.

## Misc

- Clicking on a collection name shows all media currently added to that collection.
- On the top-right side of the collection view, there is an indicator showing the number of days before removal.
- If you use a manual collection, Maintainerr will not remove that collection automatically from the connected media server.
