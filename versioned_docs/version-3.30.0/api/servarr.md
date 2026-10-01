---
slug: /api/servarr
title: Servarr API
description: Radarr, Sonarr and Sportarr disk space and quality profile lookups.
---

Read-only lookups against a configured Radarr, Sonarr or Sportarr instance. The rule editor uses them to fill its disk-path picker and quality-profile dropdown.

In every path here, `{id}` is the **Maintainerr settings row id** for that instance, not an id from the `*arr` side. Get it from `GET /api/settings/radarr`, `GET /api/settings/sonarr` or `GET /api/settings/sportarr`.

None of these depend on which media server is configured.

See [API conventions](../API.md#api-conventions) for the rules that apply across the API.

:::note Two different failure styles
The disk-space routes fail **closed**: an unreachable instance is a `500`, never a partial answer. The profile routes fail **open**: an unreachable instance returns `200` with an empty array, which you cannot tell apart from an instance that genuinely has no profiles.

The difference is deliberate. A half-failed disk-space read once reported 3.9 GB free where the instance had 15.4 GB, which was enough to fire a free-space deletion rule.
:::

## Disk space

### `GET /api/servarr/radarr/{id}/diskspace`

**Return the disk mounts of one configured Radarr instance, merged with its root folders.**

Reads the instance's disk space and root folders in parallel and merges any root-folder path the disk-space report did not already cover.

| Parameter | Type    | Required | Description                          |
| --------- | ------- | -------- | ------------------------------------ |
| `id`      | integer | Yes      | Maintainerr's Radarr settings row id |

Response:

```json
[
  {
    "id": 1,
    "path": "/movies",
    "label": "/",
    "freeSpace": 0,
    "totalSpace": 0,
    "hasAccurateTotalSpace": true
  }
]
```

| Status | Cause                                                                             |
| ------ | --------------------------------------------------------------------------------- |
| `200`  | Merged mount list, possibly empty                                                 |
| `400`  | `id` is not an integer                                                            |
| `500`  | No Radarr settings row with that id, or the disk-space or root-folder read failed |

Entries that came from the disk-space report pass through unchanged. Entries synthesised from a root folder have `label: null` and `hasAccurateTotalSpace: false`, because the root-folder resource does not report capacity.

:::caution
Do not use an entry with `hasAccurateTotalSpace: false` for a total-space comparison. Its `totalSpace` is `0`, not the real capacity. Those entries are only meaningful for free space and for the path picker.
:::

An unreachable Radarr produces a `500` and only a debug-level log line, so at the default log level nothing is recorded about it.

Both reads are cached for an hour per instance, refreshed in the background. The cache is dropped between rule group runs. The client is only rebuilt when the Radarr setting is saved or deleted, so editing the database directly is not picked up.

### `GET /api/servarr/sonarr/{id}/diskspace`

**Return the disk mounts of one configured Sonarr instance, merged with its root folders.**

Behaves exactly like the Radarr route, with one difference that matters in practice: Sonarr's disk-space report only lists fixed drives. NFS and CIFS media mounts, which are common in Docker setups, only appear through the root-folder supplement, and therefore arrive with `hasAccurateTotalSpace: false`.

| Parameter | Type    | Required | Description                          |
| --------- | ------- | -------- | ------------------------------------ |
| `id`      | integer | Yes      | Maintainerr's Sonarr settings row id |

Response shape is identical to the Radarr route.

| Status | Cause                                                                             |
| ------ | --------------------------------------------------------------------------------- |
| `200`  | Merged mount list, possibly empty                                                 |
| `400`  | `id` is not an integer                                                            |
| `500`  | No Sonarr settings row with that id, or the disk-space or root-folder read failed |

:::caution
The same total-space caveat applies, and it bites harder here: on a NAS-backed Sonarr most or all mounts arrive from the root-folder supplement with `hasAccurateTotalSpace: false`.
:::

## Quality profiles

All three profile routes return the same shape and fail open in the same way.

```json
[{ "id": 1, "name": "HD-1080p" }]
```

Only `id` and `name` are contractual. No serializer runs on these routes, so every other field the instance sends is passed through as well, such as `upgradeAllowed`, `cutoff` and `items`.

### `GET /api/servarr/radarr/{id}/profiles`

**List the quality profiles of one configured Radarr instance.**

| Parameter | Type    | Required | Description                          |
| --------- | ------- | -------- | ------------------------------------ |
| `id`      | integer | Yes      | Maintainerr's Radarr settings row id |

| Status | Cause                                                                |
| ------ | -------------------------------------------------------------------- |
| `200`  | Array of profiles, **or an empty array when the Radarr read failed** |
| `400`  | `id` is not an integer                                               |
| `500`  | No Radarr settings row with that id                                  |

An empty array means either "no profiles" or "Radarr is unreachable", and the response gives you no way to tell which. Cached for an hour per instance with a background refresh.

### `GET /api/servarr/sonarr/{id}/profiles`

**List the quality profiles of one configured Sonarr instance.**

| Parameter | Type    | Required | Description                          |
| --------- | ------- | -------- | ------------------------------------ |
| `id`      | integer | Yes      | Maintainerr's Sonarr settings row id |

| Status | Cause                                                                |
| ------ | -------------------------------------------------------------------- |
| `200`  | Array of profiles, **or an empty array when the Sonarr read failed** |
| `400`  | `id` is not an integer                                               |
| `500`  | No Sonarr settings row with that id                                  |

Same fail-open behaviour and same one-hour cache as the Radarr route.

### `GET /api/servarr/sportarr/{id}/profiles`

**List the quality profiles of one configured Sportarr instance.**

Sportarr is reached through its own native API rather than the Sonarr compatibility layer, so this route differs from the other two in a few ways.

| Parameter | Type    | Required | Description                            |
| --------- | ------- | -------- | -------------------------------------- |
| `id`      | integer | Yes      | Maintainerr's Sportarr settings row id |

Response carries an extra field the shared profile shape does not declare:

```json
[{ "id": 1, "name": "Default", "isDefault": true }]
```

| Status | Cause                                                                  |
| ------ | ---------------------------------------------------------------------- |
| `200`  | Array of profiles, **or an empty array when the Sportarr read failed** |
| `400`  | `id` is not an integer                                                 |
| `500`  | No Sportarr settings row with that id                                  |

It also fails open, but unlike the Radarr and Sonarr profile routes the failure is logged at warning level, so it is visible at the default log level. Results are cached for 20 minutes rather than an hour, and there is no background refresh: the value simply expires.
