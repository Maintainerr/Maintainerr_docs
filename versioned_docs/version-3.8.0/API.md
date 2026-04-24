---
id: api
slug: /api
description: Documentation of the Maintainerr API and its endpoints.
title: API Docs
hide:
  - navigation
  - toc
status: recent
---



:::danger
:fire: :fire: The API, and all of Maintainerr for that matter, does not have an authentication method. There are certain API calls, that if you make your instance public facing, will expose your entire settings configuration. This could include all of your service's API keys. Proceed with extreme caution if you choose to expose Maintainerr to the public. :fire: :fire:

:::
## API endpoints

:::info
The Docusaurus site does not yet embed the generated Swagger reference. Use the live Swagger UI in your Maintainerr instance at `http://<maintainerr_url>/api/swagger` for the current API surface, including newer modules such as overlays and storage metrics.
:::

The repository also carries a bundled OpenAPI YAML at `static/openapi-spec/maintainerr_api_specs.yaml`, but the live Swagger UI should still be treated as the source of truth for the running instance.

## Notable current endpoints

These are some of the newer user-facing API groups that are relevant to the current docs set.

### Collections

| Endpoint | Purpose |
| --- | --- |
| `GET /api/collections/overlay-data` | Returns collections with full media membership for overlay consumers, including the Calendar page |
| `POST /api/collections/media/handle` | Run the configured collection action immediately for one item from the collection detail modal |

### Metadata

| Endpoint | Purpose |
| --- | --- |
| `GET /api/metadata/backdrop/:type` | Resolve a backdrop image for a movie or show from the configured metadata providers |
| `GET /api/metadata/image/:type` | Resolve a poster image for a movie or show from the configured metadata providers |
| `GET /api/settings/tmdb` | Read the saved TMDB API key state |
| `POST /api/settings/tmdb` | Save a TMDB API key |
| `DELETE /api/settings/tmdb` | Remove the saved TMDB API key |
| `GET /api/settings/tvdb` | Read the saved TVDB API key state |
| `POST /api/settings/tvdb` | Save a TVDB API key |
| `DELETE /api/settings/tvdb` | Remove the saved TVDB API key |
| `GET /api/settings/metadata-provider` | Read which metadata provider is currently primary |
| `POST /api/settings/metadata-provider` | Change the primary metadata provider |
| `POST /api/settings/metadata/refresh/:provider` | Clear cached metadata for TMDB or TVDB and queue a media-server refresh pass |

### Overlays

| Endpoint | Purpose |
| --- | --- |
| `GET /api/overlays/settings` | Read global overlay settings |
| `PUT /api/overlays/settings` | Update global overlay settings |
| `GET /api/overlays/sections` | List media server library sections used by the template preview picker |
| `GET /api/overlays/random-item` | Get a random media item for poster-template preview |
| `GET /api/overlays/random-episode` | Get a random episode for title-card preview |
| `GET /api/overlays/poster` | Proxy media artwork for template preview |
| `GET /api/overlays/status` | Read the latest overlay processing status |
| `POST /api/overlays/process` | Run overlay processing for all eligible collections |
| `POST /api/overlays/process/:collectionId` | Run overlay processing for one collection |
| `POST /api/overlays/revert/:collectionId` | Revert overlays for one collection |
| `DELETE /api/overlays/reset` | Revert all overlays |
| `GET /api/overlays/fonts` | List available fonts |
| `GET /api/overlays/fonts/:name` | Read a bundled or uploaded font file |
| `POST /api/overlays/fonts` | Upload a `.ttf`, `.otf`, or `.woff` font |
| `GET /api/overlays/templates` | List overlay templates |
| `GET /api/overlays/templates/:id` | Fetch one template |
| `POST /api/overlays/templates` | Create a template |
| `PUT /api/overlays/templates/:id` | Update a template |
| `DELETE /api/overlays/templates/:id` | Delete a non-preset template |
| `POST /api/overlays/templates/:id/duplicate` | Clone a template into an editable copy |
| `POST /api/overlays/templates/:id/default` | Set a template as the default for its mode |
| `POST /api/overlays/templates/:id/export` | Export a template as JSON |
| `POST /api/overlays/templates/import` | Import a template from JSON |
| `POST /api/overlays/templates/:id/preview` | Render a server-side preview of a template on real artwork |

### Storage Metrics

| Endpoint | Purpose |
| --- | --- |
| `GET /api/storage-metrics` | Return aggregated disk usage, instance health, and collection-size summaries |
| `GET /api/storage-metrics/library-sizes` | Compute per-library sizes on demand; potentially slow on large libraries |
