---
id: overlays-feature
slug: /overlays
description: Configure poster and title card overlays for eligible Maintainerr collections.
title: Overlays
---

Overlays let Maintainerr draw collection-specific artwork onto media so it is easier to see that an item is queued for action.

:::note
Overlays are intended for supported media servers in this release line.
:::

## Where to find it

Maintainerr exposes three overlay screens:

- `Overlays` navigation entry
- `Settings` tab at `/overlays/settings`
- `Existing Templates` and `New Template` tabs under `/overlays/templates`

## Overlay settings

The `Settings` tab contains the global controls for overlay processing.

- `Enable overlays` is the master switch.
- `Run Now` starts an immediate forced reapply pass for all eligible collections, even if an item's saved overlay state already matches the current days-left value.
- `Reset All Overlays` reverts posters that Maintainerr has changed.

Overlay settings are stored globally, while template selection is stored per collection.

Use `Reset All Overlays` carefully. It is intended to undo Maintainerr-managed overlay artwork across collections, and it is unavailable while another overlay-processing run is already in progress.

## Templates

Templates define how Maintainerr renders overlays.

- `Poster` templates are used for movie, show, and season collections.
- `Title card` templates are used for episode collections.

Template management supports:

- creating new templates
- editing custom templates
- duplicating preset templates before changing them
- setting a default template for each mode
- importing and exporting templates as JSON

Maintainerr seeds preset templates automatically on first run. Presets are meant to be a starting point, not something you edit in place.

Preset templates cannot be edited directly. Duplicate them first, then edit the duplicate.

## Template editor

The editor lets you design overlay elements on top of a preview image.

- For poster templates, Maintainerr can load a random item from a media server library section.
- For title card templates, Maintainerr can load a random episode from a media server library section.
- You can upload custom fonts in `.ttf`, `.otf`, or `.woff` format.
- Image elements can use uploaded `.png`, `.jpg`/`.jpeg`, or `.webp` assets up to `500 KB`.
- Template previews are rendered server-side against real media artwork.

If you leave a collection without a specific overlay template selected, Maintainerr uses the current default template for that mode.

Uploaded image assets are stored by filename and appear in the image-element picker after upload. Maintainerr validates both the filename and the file contents, so renamed or unsupported files are rejected instead of being served back later with the wrong content type.

## How template selection works

When Maintainerr processes an overlay-enabled collection, template resolution is:

1. the collection-specific template, if one is selected and still exists
2. the default template for that mode (`poster` or `titlecard`)
3. skip overlay processing for that collection if no template can be resolved

Episode collections use `titlecard` mode. Other supported collection types use `poster` mode.

## Enabling overlays on a collection

Overlay controls also appear in the rule or collection form.

- `Enable overlays` turns overlays on for that collection.
- `Overlay template` optionally selects a specific template.
- Leaving `Overlay template` empty uses the default poster or title card template.

This setting is stored on the collection, so existing collections can be updated later without rebuilding your whole setup.

## Processing behavior

Overlay processing only applies when all of these are true:

- overlays are enabled globally
- a supported media server is configured
- the collection has overlays enabled
- the collection has `Take action after days` set
- a matching template can be resolved

Maintainerr re-renders overlays when the visible days-left value changes, and it can revert overlay artwork for a single collection or for all collections.

Normal scheduled runs skip items whose saved overlay state already matches the current visible day count. `Run Now` uses the forced path instead, so you can reapply overlays after another artwork tool or a manual media-server edit replaced them without waiting for the countdown to change first.

Maintainerr saves the original artwork the first time it applies an overlay, then reuses that saved original for later updates so overlays do not stack on top of previous overlays. Revert actions and `Reset All Overlays` restore those saved originals.

## Coexisting with other artwork tools

Maintainerr is one writer among several. Tools like [Kometa](https://kometa.wiki) and [Posterizarr](https://github.com/fscorrupt/Posterizarr), or manual uploads in Plex/Jellyfin, may replace Maintainerr's overlaid artwork between runs.

Per-item overlays carry day-counter state, so they're re-applied on every cron tick (and on demand via `Run Now`). That means:

- If Kometa restores its own artwork after Maintainerr writes an overlay, Maintainerr will reapply the overlay on the next run.
- The cron interval determines how quickly that reconciliation happens — set it to match how often Kometa or other tools touch artwork.
- After `Reset All Overlays`, Maintainerr restores its saved originals and stops re-writing. Other tools may still overwrite the artwork afterwards; that's expected.

Collection posters (see [Collections — Custom Poster](./Collections.md#custom-poster)) behave differently: they're a one-shot write with no schedule, so other artwork tools can win against them permanently until you re-upload.

## Upgrade notes

Recent Maintainerr releases add overlay tables and new collection fields to the database. On first startup after upgrading, allow database migration to finish before opening the Overlays pages.
