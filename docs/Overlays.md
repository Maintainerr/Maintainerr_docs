---
id: overlays-feature
slug: /overlays
description: Configure poster and title card overlays for eligible Maintainerr collections.
title: Overlays
---

Overlays let Maintainerr draw collection-specific artwork onto media so it is easier to see that an item is queued for action.

:::note
Overlays are available for supported media servers.
:::

## Where to find it

Maintainerr exposes three overlay screens:

- `Overlays` navigation entry
- `Settings` tab at `/overlays/settings`
- `Existing Templates` and `New Template` tabs under `/overlays/templates`

## Overlay settings

The `Settings` tab contains the global controls for overlay processing. Overlay settings are stored globally, while template selection is stored per collection.

- `Enable overlays` is the master switch.
- `Run Now` starts an overlay run immediately, instead of waiting for the next scheduled one. It also redraws overlays that are already up to date, which a scheduled run leaves alone. Use it after another artwork tool or a manual edit has replaced an overlay.
- `Reset All Overlays` puts the original artwork back on every item Maintainerr has drawn on. Use it carefully. It is unavailable while an overlay run is going on.

## Templates

Templates define how Maintainerr draws overlays. Which template is used depends on the item it is drawn on. Episodes use a `Title card` template. Movies, shows and seasons use a `Poster` template. Each kind has its own default, so you see a `Default` badge in both lists.

Template management supports:

- creating new templates
- editing custom templates
- duplicating preset templates before changing them
- setting a default template for each mode
- importing and exporting templates as JSON

Maintainerr seeds preset templates automatically on first run. They are a starting point and cannot be edited in place: duplicate one first, then edit the duplicate.

## Template editor

The editor lets you design overlay elements on top of a preview image.

- The kind of template you are editing is shown next to its name. You choose it when you create the template, and it cannot be changed later.
- For poster templates, Maintainerr can load a random item from a media server library section.
- For title card templates, Maintainerr can load a random episode from a media server library section.
- You can upload custom fonts in `.ttf`, `.otf`, or `.woff` format.
- Image elements can use uploaded `.png`, `.jpg`/`.jpeg`, or `.webp` assets up to `500 KB`.
- Template previews are rendered server-side against real media artwork.

Uploaded image assets are stored by filename and appear in the image-element picker after upload. Maintainerr validates both the filename and the file contents, so renamed or unsupported files are rejected instead of being served back later with the wrong content type.

## How template selection works

When Maintainerr processes an overlay-enabled collection, template resolution is:

1. the collection-specific template, if one is selected and still exists
2. otherwise the default poster or title card template, whichever fits the item
3. if there is no template either way, the collection is skipped

## Enabling overlays on a collection

Overlay controls also appear in the rule or collection form.

- `Enable overlays` turns overlays on for that collection.
- `Overlay template` optionally selects a specific template. Leave it empty to follow the default.

This setting is stored on the collection, so existing collections can be updated later without rebuilding your whole setup.

## Processing behavior

Overlay processing only applies when all of these are true:

- overlays are enabled globally
- a supported media server is configured
- the collection has overlays enabled
- the collection has `Take action after days` set
- a matching template can be resolved

Maintainerr re-renders overlays when the visible days-left value changes, and it can revert overlay artwork for a single collection or for all collections.

Deleting a collection restores its overlays first, so its items keep their original artwork.

## Media that gets deleted along with a collection

When a collection's action deletes files, more than the items in the collection are deleted. Maintainerr draws the same countdown on those extra items:

- Everything under an item in the collection. Deleting a show also deletes its seasons and episodes. Deleting a season also deletes its episodes.
- A season or show that is left empty. If every episode of a season is in the collection, the season goes with them. If every season of a show is in the collection, the show goes too. Both get the date of the last item to be deleted. A leftover `Specials` season does not stop this.

These extra items only get an overlay. They are never added to the collection, so nothing extra is deleted.

This happens for show, season and episode collections that have `Take action after days` set and an action that deletes files. Actions that keep the files, such as `Unmonitor and keep files`, `Change quality profile` and `Do nothing`, draw nothing extra. Neither do movie collections, because deleting a movie deletes nothing else.

Episodes need a title card template, so make sure you have one if a show or season collection reaches down to episodes. Without it, those episodes are skipped and the log says so.

If Maintainerr cannot reach your media server while it works out what else gets deleted, it leaves the overlays it has already drawn instead of removing them.

## Stored files and reverting

Maintainerr keeps no on-disk copy of a rendered overlay. It renders the image in memory and uploads it to the media server as the item's artwork.

Before it first applies an overlay to an item, Maintainerr saves the item's original artwork in its data directory under `overlays/originals/`, named for the media-server item ID. Every later render starts from that saved original instead of already-overlaid artwork, so overlays do not stack.

Uploaded fonts and images are stored in the same data directory under `overlays/fonts/` and `overlays/images/`. These originals, fonts, and images are included when you back up the data directory.

When an overlay is reverted, Maintainerr uploads the saved original to the media server, then removes the backup file and its state record. If the upload fails, it keeps both so a later run can retry instead of discarding the only original during a temporary media-server outage.

## Coexisting with other artwork tools

Maintainerr is one writer among several. Tools like [Kometa](https://kometa.wiki) and [Posterizarr](https://github.com/fscorrupt/Posterizarr), or manual uploads in Plex/Jellyfin, may replace Maintainerr's overlaid artwork between runs.

Per-item overlays carry day-counter state, so they're re-applied on every cron tick (and on demand via `Run Now`). That means:

- If Kometa restores its own artwork after Maintainerr writes an overlay, Maintainerr will reapply the overlay on the next run.
- The cron interval determines how quickly that reconciliation happens: set it to match how often Kometa or other tools touch artwork.
- After `Reset All Overlays`, Maintainerr restores its saved originals and stops re-writing. Other tools may still overwrite the artwork afterwards; that's expected.

Collection posters (see [Collections - Custom Poster](./Collections.md#custom-poster)) behave differently: they're a one-shot write with no schedule, so other artwork tools can win against them permanently until you re-upload.

## Upgrade notes

On first startup after upgrading, allow database migration to finish before opening the Overlays pages.
