---
id: collections
slug: /collections
description: Information about collection generation, media server syncing, and manual actions.
title: Collections
---

A collection is auto generated when defining a rule. A collection holds all media that either got picked up by the handling of the corresponding rule or got manually added.

When the specified amount of days that media must live in the collection is passed, the collection handler job will perform the necessary cleanup actions.

:::note Collection Handling
     Collection handling is a batch process that runs every 12 hours. You can manually trigger it with the `Handle collection` button on the Collections page.
:::

## Media Server

A collection will be reflected in your media server when it contains media. When no media is present, there's no use of having it in your media server. The collection's title and description will be the same as the one in Maintainerr.

If the `Show on home` option was checked, the collection will be shown on all users' home screens. This allows you to create, for instance, a 'Leaving soon' list.

## Calendar and overlays

Collections now power additional Maintainerr views beyond cleanup.

- The [Calendar](./Calendar.md) page shows when collection media is scheduled to reach its configured action date.
- Overlay-enabled collections can apply poster or title card artwork to help identify queued media in your media server.

In the rule or collection form, you can enable overlays per collection and optionally choose a specific overlay template. Movies, shows, and seasons use poster templates. Episode collections use title card templates.

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

- Maintainerr will never remove the collection from your media server if you specified a manual collection.

- Collections with `Do nothing` are not shown on the [Calendar](./Calendar.md) page because they do not schedule a cleanup action.
