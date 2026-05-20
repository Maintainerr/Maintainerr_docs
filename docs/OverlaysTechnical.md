---
id: overlays-technical-reference
slug: /technical/overlays
description: Internal reference for Maintainerr's overlay architecture, template model, and rendering pipeline.
title: Overlay Technical Reference
---

This page ports the missing technical details from Maintainerr's upstream `docs/overlay-feature.md`.

For user-facing setup and endpoint summaries, use [Overlays](./Overlays.md), [Collections](./Collections.md), [Migration](./Migration.md), and [API](./API.md). This page focuses on the internal model behind the feature.

## Feature architecture

The overlay system is built around reusable templates plus a media-server-specific provider abstraction.

### Main pieces

- shared schemas and types in `packages/contracts/src/overlays/`
- NestJS overlay module in `apps/server/src/modules/overlays/`
- per-server providers in `apps/server/src/modules/overlays/providers/`
- bundled server font assets in `apps/server/assets/fonts/`
- visual editor pages and components in `apps/ui/src/pages/` and `apps/ui/src/components/OverlayEditor/`

### Processing flow

1. A template is created or updated in the visual editor
2. The template JSON is stored in `overlay_templates`
3. A scheduled run or manual `Run Now` pass resolves the active media-server provider
4. Each overlay-enabled collection resolves a template in this order:
   1. collection-specific template override
   2. default template for the mode
   3. skip the collection when neither exists
5. For each eligible media item, Maintainerr loads the original artwork, renders the overlay, uploads the new artwork, and records overlay state

## Template model

Overlay templates are reusable canvas definitions.

### Supported element types

- static text
- variable text (`date`, `days`, `daysText`)
- shapes (`rectangle` and `ellipse`)
- uploaded images

### Canvas modes

| Mode | Canvas |
| --- | --- |
| `poster` | `1000 x 1500` |
| `titlecard` | `1920 x 1080` |

### Built-in presets

- Classic Pill
- Countdown Bar
- Corner Badge
- Title Card Pill

Each template also tracks its own description, mode, size, element list, default status, preset status, and timestamps.

## Storage model and database state

The upstream overlay notes document three core persistence areas.

### `overlay_settings`

Singleton settings for the overlay feature:

- global enable/disable state
- cron schedule
- legacy text/style/frame JSON fields kept for compatibility with the earlier pill-based renderer

### `overlay_item_state`

Per-item tracking for processed artwork:

- collection id
- media-server id
- saved original-poster path
- the `daysLeftShown` value currently rendered onto the item
- processing timestamp

The table uses a unique `(collectionId, mediaServerId)` constraint so repeated runs upsert state for the same item.

### Collection fields

Collections store:

- `overlayEnabled`
- `overlayTemplateId`

Those fields are passed through both create and update flows so rules can opt a collection into overlays and optionally pin a template.

## Provider abstraction

The overlay module does not talk to Plex or Jellyfin directly. It uses `IOverlayProvider`.

### Provider responsibilities

- report whether the backing media server is ready
- list preview sections for the editor
- return random preview items or episodes
- download the item's current artwork
- upload the newly rendered artwork

### Server-specific behavior hidden behind the provider

| Server | Behavior hidden by the provider |
| --- | --- |
| Plex | Upload -> diff -> select flow through existing `setThumb` logic |
| Jellyfin | Atomic image replacement through `setItemImage` with `ImageType.Primary` |

The provider keeps these differences out of the shared overlay processor and renderer.

## Rendering pipeline

The renderer uses `node-canvas` for text/shape drawing and `sharp` for image work.

### Render steps

1. Read the target artwork dimensions
2. Scale template coordinates from the template canvas to the real image size
3. Sort visible elements by `layerOrder`
4. Render each element type to a layer buffer
5. Apply rotation and opacity
6. Clamp rotated layers back to the poster bounds
7. Composite all visible layers
8. Export the final result as JPEG

### Variable text formatting

Variable elements carry their own formatting configuration, including:

- `dateFormat`
- `language`
- optional English day suffix handling
- separate text for `today`, `1 day`, and `N days`

That lets two variable elements in the same template render the same date or countdown differently.

## Original-poster backup behavior

When Maintainerr overlays an item for the first time, it stores the original artwork in `{DATA_DIR}/overlays/originals/{mediaServerId}.jpg`.

That backup is then reused for future re-renders so overlays do not stack on top of previously overlaid artwork. When an item or collection is reverted, Maintainerr uploads the saved original back to the media server and removes the saved backup file.

## Scheduler and status tracking

The overlay task service owns the scheduled processing path.

- It reads the cron schedule on startup
- it hot-updates the cron job when settings change
- it runs `processAllCollections()` only when overlays are enabled
- it tracks processor status, last run time, and the last run result

The upstream technical notes also document the emitted events:

- `OverlayHandler_Started`
- `OverlayHandler_Finished`
- `OverlayHandler_Failed`
- `Overlay_Applied`
- `Overlay_Reverted`

## UI internals

The upstream overlay document records these implementation details for the editor:

- template list and settings live on the same main page
- templates are grouped by mode
- presets are view-only
- import/export uses JSON based on `OverlayTemplateExport`
- the editor uses a Konva canvas with drag/transform support
- the right-hand layer panel manages visibility, ordering, and deletion
- undo/redo is handled with a dedicated state-history hook

The preview-background picker fetches real artwork from the active media server so template design happens against actual posters or episode stills instead of placeholder images.

## Runtime dependencies and fonts

The overlay feature depends on native graphics libraries for both build-time and runtime images.

### Native dependencies called out upstream

- `cairo`
- `pango`
- `jpeg`
- `giflib`
- `pixman`
- `librsvg`

### Bundled fonts

The upstream technical document lists these bundled font families:

- Inter
- Roboto
- Comfortaa

Users can also upload `.ttf`, `.otf`, and `.woff` fonts, which are stored under `{DATA_DIR}/overlays/fonts/`.
