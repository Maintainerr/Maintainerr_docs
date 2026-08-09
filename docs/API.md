---
id: api
slug: /api
description: Documentation of the Maintainerr API and its endpoints.
title: API Docs
hide:
  - navigation
  - toc
---

:::danger
:fire: :fire: The API, and all of Maintainerr for that matter, does not have an authentication method. There are certain API calls, that if you make your instance public facing, will expose your entire settings configuration. This could include all of your service's API keys. Proceed with extreme caution if you choose to expose Maintainerr to the public. See the [Security & Authentication](./Security.md) page for guidance on protecting your instance. :fire: :fire:

:::

## API endpoints

:::info
The Docusaurus site does not yet embed the generated Swagger reference. Use the live Swagger UI in your Maintainerr instance at `http://<maintainerr_url>/api/swagger` for the current API surface, including modules such as overlays and storage metrics.
:::

The repository also carries a bundled OpenAPI YAML at `static/openapi-spec/maintainerr_api_specs.yaml`, but the live Swagger UI should still be treated as the source of truth for the running instance.

## Notable endpoints

These sections cover notable user-facing API groups.

### Health

Maintainerr exposes lightweight health endpoints under `/api/health` (prefixed with `BASE_PATH` when set) for orchestration probes and uptime monitoring.

| Endpoint                | Purpose                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `GET /api/health/live`  | Liveness probe; returns `200` while the process is running and does not touch the database |
| `GET /api/health/ready` | Readiness probe; runs a database `SELECT 1` check and returns `200` or `503`               |
| `GET /api/health`       | Convenience alias that mirrors `/api/health/ready`                                         |

`GET /api/health/live` returns a lightweight envelope such as:

```json
{
  "status": "ok",
  "uptimeSeconds": 1234,
  "timestamp": "2026-06-05T12:00:00.000Z"
}
```

`GET /api/health/ready` and `GET /api/health` include database status:

```json
// 200
{ "status": "ok", "uptimeSeconds": 1234, "database": "ok", "timestamp": "..." }
// 503
{ "status": "degraded", "uptimeSeconds": 1234, "database": "unreachable", "timestamp": "..." }
```

- Only the database gates readiness. External integrations such as Plex/Jellyfin, the `*arr` stack, Seerr, Tautulli, and Streamystats are intentionally excluded so transient upstream outages do not take Maintainerr out of rotation.
- The bundled Docker image ships a `HEALTHCHECK` that calls `/api/health/ready` and honours both `BASE_PATH` and `UI_PORT`.
- For Kubernetes, use `/api/health/live` as the `livenessProbe` and `/api/health/ready` as the `readinessProbe`. If `BASE_PATH` is set, prefix both probe paths accordingly.

### Collections

| Endpoint                             | Purpose                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `GET /api/collections/overlay-data`  | Returns collections with full media membership for overlay consumers, including the Calendar page |
| `POST /api/collections/media/handle` | Run the configured collection action immediately for one item from the collection detail modal    |
| `GET /api/collections/:id/poster`    | Return the stored custom collection poster as `image/jpeg`, or `404` when none exists             |
| `POST /api/collections/:id/poster`   | Upload a custom collection poster with multipart field `poster`; returns `{ pushed, attempted }`  |
| `DELETE /api/collections/:id/poster` | Clear the stored poster and return `{ cleared, refreshRequested }`                                |

The lower-level `POST /api/media-server/collection` request body matches `CreateCollectionParams`: `libraryId`, `title`, and `type` are required, with optional `summary`, `sortTitle`, and `initialItemId`. `initialItemId` is a single media-server item id used when a collection must be created with one initial member; remaining items are still added afterwards through the normal collection-sync path.

### Bulk media actions

These back the `Add / Remove Media` modal described in [Collections](./Collections.md#add-remove-media-modal).

| Endpoint                           | Purpose                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `POST /api/collections/media/bulk` | Add a media selection to one collection, or remove it from one or from all of them |
| `POST /api/rules/exclusions/bulk`  | Exclude a media selection, or drop its exclusions, globally or for one rule group  |

Both endpoints take the same fields:

| Field          | Description                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mediaIds`     | 1 to 250 media-server ids                                                                                                                                        |
| `action`       | `0` adds, `1` removes                                                                                                                                            |
| `collectionId` | Limits the call to one collection. Leave it out to mean every collection, which `/collections/media/bulk` allows only for a removal                              |
| `mediaType`    | `movie`, `show`, `season`, or `episode`. Required by `/collections/media/bulk`, so the server can work out the seasons and episodes without looking up each item |
| `context`      | Optional `{ id, type }` that narrows a one-item selection to a single season or episode. Sending it with more than one id is an error                            |

The 250 limits one request, not how much a user can select. The web UI sends 25 ids per request and splits a bigger selection across several calls, so only direct API callers reach it.

If some items fail, the rest still go through. Both endpoints answer `{ results: [{ mediaId, code, message? }] }`, where `code` is `1` for success and `0` for failure, with `message` explaining a failure. A request is rejected outright with `400` only when it is empty, holds more than 250 ids, or asks to add without naming a collection.

Adding an exclusion takes the collection and rule execution lock, on both `POST /api/rules/exclusions/bulk` and `POST /api/rules/exclusion`, so it cannot land while a run is acting on the same item. Both wait up to 30 seconds for a running job and answer `409` if it is still going. Removing an exclusion takes no lock.

### Metadata

| Endpoint                                        | Purpose                                                                                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/metadata/backdrop/:type`              | Resolve a backdrop image from the configured metadata providers. `:type` is `movie` or `show`                                                               |
| `GET /api/metadata/overview/:type`              | Resolve an overview from the configured metadata providers. `:type` is `movie` or `show`; pass a season's or episode's `itemId` to get that item's overview |
| `GET /api/metadata/image/:type`                 | Resolve a poster image from the configured metadata providers. `:type` is `movie` or `show`                                                                 |
| `GET /api/settings/tmdb`                        | Read the saved TMDB API key state                                                                                                                           |
| `POST /api/settings/tmdb`                       | Save a TMDB API key                                                                                                                                         |
| `DELETE /api/settings/tmdb`                     | Remove the saved TMDB API key                                                                                                                               |
| `GET /api/settings/tvdb`                        | Read the saved TVDB API key state                                                                                                                           |
| `POST /api/settings/tvdb`                       | Save a TVDB API key                                                                                                                                         |
| `DELETE /api/settings/tvdb`                     | Remove the saved TVDB API key                                                                                                                               |
| `GET /api/settings/metadata-provider`           | Read which metadata provider is currently primary                                                                                                           |
| `POST /api/settings/metadata-provider`          | Change the primary metadata provider                                                                                                                        |
| `POST /api/settings/metadata/refresh/:provider` | Clear cached metadata for TMDB or TVDB and queue a media-server refresh pass                                                                                |

### Media server settings

| Endpoint                        | Purpose                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /api/settings/emby`        | Read the saved Emby URL, API key, and selected admin user                                       |
| `POST /api/settings/emby/test`  | Test an Emby URL and API key, and return available admin users                                  |
| `POST /api/settings/emby`       | Save Emby connection settings                                                                   |
| `DELETE /api/settings/emby`     | Remove the saved Emby connection settings                                                       |
| `POST /api/settings/emby/login` | Authenticate with an Emby admin username/password and return an API key plus admin-user choices |

### Download Client

| Endpoint                                  | Purpose                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /api/settings/download-client`       | Read the saved qBittorrent connection and cleanup options                       |
| `POST /api/settings/download-client`      | Save qBittorrent connection and cleanup options                                 |
| `DELETE /api/settings/download-client`    | Remove the saved download-client connection settings                            |
| `POST /api/settings/test/download-client` | Test the qBittorrent Web UI URL, credentials, and cleanup options before saving |

### Streamystats (Jellyfin only)

| Endpoint                               | Purpose                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /api/settings/streamystats`       | Read the saved Streamystats base URL                                                                 |
| `POST /api/settings/test/streamystats` | Test a Streamystats URL using the currently configured Jellyfin API key                              |
| `POST /api/settings/streamystats`      | Save the Streamystats base URL                                                                       |
| `DELETE /api/settings/streamystats`    | Remove the saved Streamystats base URL                                                               |
| `GET /api/streamystats/info`           | Return the configured Streamystats URL plus the resolved Jellyfin server id used for deep links      |
| `GET /api/streamystats/items/:itemId`  | Return Streamystats watch-history totals, per-user stats, and episode progress for one Jellyfin item |

### Tracearr

| Endpoint                              | Purpose                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GET /api/settings/tracearr`          | Read the saved Tracearr base URL, API key, and bound Tracearr server                                       |
| `POST /api/settings/test/tracearr`    | Test a Tracearr URL and API key before saving                                                              |
| `POST /api/settings/tracearr/servers` | Discover the Tracearr servers available for a URL and API key so the settings UI can populate the selector |
| `POST /api/settings/tracearr`         | Save the Tracearr connection settings                                                                      |
| `DELETE /api/settings/tracearr`       | Remove the saved Tracearr connection settings                                                              |

`server_id` is optional on `POST /api/settings/tracearr`. Leave it out and Maintainerr picks the Tracearr server that tracks your media server; send it only when Tracearr has several servers of that type. Either way the save is refused if no server matches, or if the one you sent tracks a different media server.

### Overlays

| Endpoint                                     | Purpose                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `GET /api/overlays/settings`                 | Read global overlay settings                                                  |
| `PUT /api/overlays/settings`                 | Update global overlay settings                                                |
| `GET /api/overlays/sections`                 | List media server library sections used by the template preview picker        |
| `GET /api/overlays/random-item`              | Get a random media item for poster-template preview                           |
| `GET /api/overlays/random-episode`           | Get a random episode for title-card preview                                   |
| `GET /api/overlays/poster`                   | Proxy media artwork for template preview                                      |
| `GET /api/overlays/status`                   | Read the latest overlay processing status                                     |
| `POST /api/overlays/process`                 | Run overlay processing for all eligible collections                           |
| `POST /api/overlays/process/:collectionId`   | Run overlay processing for one collection                                     |
| `POST /api/overlays/revert/:collectionId`    | Revert overlays for one collection                                            |
| `DELETE /api/overlays/reset`                 | Revert all overlays                                                           |
| `GET /api/overlays/fonts`                    | List available fonts                                                          |
| `GET /api/overlays/fonts/:name`              | Read a bundled or uploaded font file                                          |
| `POST /api/overlays/fonts`                   | Upload a `.ttf`, `.otf`, or `.woff` font                                      |
| `GET /api/overlays/images`                   | List uploaded overlay image assets                                            |
| `GET /api/overlays/images/:name`             | Read an uploaded overlay image asset                                          |
| `POST /api/overlays/images`                  | Upload a `.png`, `.jpg`/`.jpeg`, or `.webp` image for template image elements |
| `DELETE /api/overlays/images/:name`          | Delete an uploaded overlay image asset                                        |
| `GET /api/overlays/templates`                | List overlay templates                                                        |
| `GET /api/overlays/templates/:id`            | Fetch one template                                                            |
| `POST /api/overlays/templates`               | Create a template                                                             |
| `PUT /api/overlays/templates/:id`            | Update a template                                                             |
| `DELETE /api/overlays/templates/:id`         | Delete a non-preset template                                                  |
| `POST /api/overlays/templates/:id/duplicate` | Clone a template into an editable copy                                        |
| `POST /api/overlays/templates/:id/default`   | Set a template as the default for its mode                                    |
| `POST /api/overlays/templates/:id/export`    | Export a template as JSON                                                     |
| `POST /api/overlays/templates/import`        | Import a template from JSON                                                   |
| `POST /api/overlays/templates/:id/preview`   | Render a server-side preview of a template on real artwork                    |

`POST /api/overlays/process` accepts an optional `{ force: true }` body to reapply overlays even when the saved day-count state is already current. Its run summary always reports `processed`, `reverted`, `skipped`, and `errors`.

`POST /api/overlays/process` and `DELETE /api/overlays/reset` both return `409 Conflict` if another overlay-processing run is already active.

### Storage Metrics

| Endpoint                                 | Purpose                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /api/storage-metrics`               | Return aggregated disk usage, instance health, collection-size summaries, and cumulative cleanup totals |
| `GET /api/storage-metrics/library-sizes` | Compute per-library sizes on demand; potentially slow on large libraries                                |

`GET /api/storage-metrics` includes `cleanupTotals` counters for `itemsHandled`, `moviesHandled`, `showsHandled`, `seasonsHandled`, and `episodesHandled`, plus reclaimed-byte totals in `bytesHandled`, `movieBytesHandled`, `showBytesHandled`, `seasonBytesHandled`, and `episodeBytesHandled`.

The same response also includes `collectionSummary` type breakdowns for `movieSizeBytes`, `showSizeBytes`, `seasonSizeBytes`, `episodeSizeBytes`, and per-type reclaimable collection counts such as `reclaimableMovieCount`.

Collection payloads carry an optional `mediaServerSort` key. It stores the collection's saved media-server sort order as `{field}.{order}` (for example `deleteSoonest.asc`) when the connected server supports collection sorting.
