---
id: overlays-internals
slug: /overlays-internals
description: Contributor reference for the Maintainerr overlay architecture.
title: Overlay Internals
---

This page describes overlay internals for contributors. If it ever disagrees with the behavior documented on the [Overlays](./Overlays.md) page, the Overlays page takes precedence.

## Overview

The overlay feature renders reusable templates onto artwork for media in Maintainerr collections. Templates are compositions of text, dynamic text, shapes, and uploaded images. The server renders the composition onto the item's original artwork, then the configured media-server provider replaces that item's artwork.

The implementation is split into:

- `packages/contracts/src/overlays/` - shared schemas, types, defaults, and provider-facing DTOs
- `apps/server/src/modules/overlays/` - the NestJS module, its services, and database entities
- `apps/server/src/modules/overlays/providers/` - the media-server abstraction and its Plex, Jellyfin, and Emby implementations

The overlays module uses the provider abstraction rather than media-server-specific types. The provider factory selects the implementation for the configured media server.

## Processing architecture

The normal render path is:

1. A collection with overlays enabled supplies its media items and deletion timing.
2. The processor selects poster or title card mode, resolves the collection's template or the default template, and obtains the active provider.
3. For each item that needs updating, the provider downloads its artwork unless Maintainerr already has a saved original.
4. The processor supplies the original artwork, template elements, canvas dimensions, deletion date, and remaining-day count to the renderer.
5. The renderer scales and composites visible elements in layer order, resolving dynamic text from the render context, and returns a JPEG image.
6. The provider uploads that JPEG as the item's artwork and the processor records the successful state.

This separation keeps media-server I/O, overlay rendering, collection processing, and persistence independent. Preview rendering uses the same renderer and provider download path, but does not update an item's artwork or state.

## Shared contracts

The contracts in `packages/contracts/src/overlays/` are Zod schemas and inferred TypeScript types shared across the application. They define validation at system boundaries and the shape used by the UI and server.

- `overlay-element.ts` defines the template canvas model. It has common positioning, visibility, layering, rotation, and opacity properties, then distinct text, variable-text, shape, and image elements. Variable text combines literal segments with deletion-date and countdown values. It also provides safe-filename validation for font and image assets.
- `overlay-template.ts` defines poster and title-card templates, create and update inputs, import and export formats, canvas defaults, and built-in presets. A template holds its mode, dimensions, element composition, and default or preset status.
- `overlay-render.ts` defines requests for preview rendering, the renderer input and output shapes, and the normalized styling information required to produce a JPEG.
- `overlay-settings.ts` defines global overlay settings and partial updates, including enabled state, schedule, and the older text, style, and frame configuration that can be imported or exported.
- `overlay-text-config.ts`, `overlay-style-config.ts`, and `frame-config.ts` define the reusable text, visual style, and frame or dock configuration used by those settings.
- `overlay-state.ts` defines the per-item state exposed by the feature: the collection and media-server item identity, saved-original reference, displayed day count, and processing time.
- `overlay-processor.ts` defines the process request and the aggregate result counters for processed, reverted, skipped, and failed items.
- `overlay-provider-dtos.ts` defines the small library-section and preview-item shapes needed by the editor without exposing full media-library models.
- `index.ts` exports the overlay contracts as the package's public overlay surface.

## Server services

The overlays module is organized around six services:

- `OverlayTemplateService` persists templates, seeds presets for an empty installation, maintains one default per mode, resolves the template for a collection, and handles template import and export.
- `OverlaySettingsService` owns the singleton global settings record, validates updates, and imports or exports settings for each overlay mode.
- `OverlayStateService` persists per-item processing state so the processor can detect unchanged countdowns and locate an item's saved original.
- `OverlayRenderService` renders template elements onto source artwork. It resolves dynamic values, renders the individual layers, and composites them into JPEG output.
- `OverlayProcessorService` coordinates applying and reverting overlays. It selects eligible collections, resolves templates and providers, manages original-artwork backups, and records successful processing.
- `OverlayTaskService` integrates overlay processing with the task scheduler. It configures the scheduled job from global settings and runs the processor when overlays are enabled.

The provider factory and provider implementations sit beside these services. They provide a server-neutral interface for availability checks, editor helpers, downloading artwork, and uploading the rendered image.

## Storage and recovery

The TypeORM schema for overlays is created by a TypeORM migration. The database stores:

- one global settings record
- template metadata and each template's element composition
- per-item state, keyed by collection and media-server item, including the last displayed day count and the path to the saved original

Maintainerr does not keep a separate on-disk copy of each rendered overlay. The renderer produces a JPEG in memory and the provider writes it to the media server as the item's artwork.

Before the first successful overlay for an item, the processor saves the downloaded original under the instance data directory at `overlays/originals/`, named for the media-server item ID. Later updates render from that saved original rather than the already-overlaid artwork, which prevents overlays from accumulating.

When an overlay is reverted, Maintainerr uploads the saved original, then removes both its backup file and state record. If restoration cannot be completed, it retains them so a future run can retry. Backup fonts and image assets are stored separately under `overlays/fonts/` and `overlays/images/` in the instance data directory.
