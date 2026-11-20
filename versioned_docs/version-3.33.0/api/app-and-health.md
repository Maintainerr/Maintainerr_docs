---
slug: /api/app-and-health
title: App and Health API
description: Application status, version, time zone, GitHub releases, health probes, and task status.
---

Endpoints for the running build itself: what version it is, what time zone it resolved, whether it is healthy, and whether a scheduled task is running.

The health probes are the one part of the API that reports failure with a real HTTP error code. Everything else here answers `200` whatever happens. See [API conventions](../API.md#api-conventions) for the rules that apply across the API.

## App

### `GET /api/app/status`

**Report the running build's version and whether a newer build exists upstream.**

Reads the build environment and then asks GitHub whether a newer build exists. Release builds compare their version against the latest GitHub release. Other builds compare their commit against the head of `main` or `development`, and skip the network call entirely when the build carries no commit id.

Response:

```json
{
  "status": 1,
  "version": "3.25.0",
  "commitTag": "latest",
  "updateAvailable": false
}
```

| Field             | Meaning                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| `status`          | `1` normally, `0` when the version lookup threw                                                      |
| `version`         | The package version for a release build, otherwise `tag-shortsha`, for example `development-bd8a1e0` |
| `commitTag`       | `local` outside production. In production it is the image tag, or empty for a non-release build      |
| `updateAvailable` | Whether a newer build was found                                                                      |

| Status | Cause                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| `200`  | Always. On an internal error the body falls back to `status: 0`, `version: "0.0.1"`, `updateAvailable: false` |

Two traps. The handler returns the payload as a string, so the response is sent with `Content-Type: text/html; charset=utf-8` even though the body is valid JSON. A client that dispatches on content type will need to parse it manually. And the update check fails open: an unreachable GitHub gives `updateAvailable: false`, which is indistinguishable from being up to date.

### `GET /api/app/timezone`

**Return the IANA time zone the server process resolved.**

Reports the time zone the process is running in, which is whatever `TZ` resolved to inside the container. Nothing is read from the database.

The response is a bare string, not JSON:

```text
Europe/Stockholm
```

| Status | Cause                                   |
| ------ | --------------------------------------- |
| `200`  | Always. The handler has no failure path |

Because the body is a plain string it is sent as `Content-Type: text/html; charset=utf-8` and is **not** valid JSON. Clients that always parse JSON will fail on it. When the host time zone cannot be determined the value is `UTC`.

### `GET /api/app/releases`

**Return the 10 most recent Maintainerr GitHub releases.**

Proxies GitHub's release listing for the Maintainerr repository and returns the raw GitHub objects with no filtering or reshaping. This is what fills the releases block on the Settings, About page.

Response is a JSON array of GitHub release objects. Each carries at least `tag_name`, `name`, `body`, `html_url`, `created_at` and `published_at`, plus every other field GitHub sends, such as `id`, `draft`, `prerelease`, `tarball_url` and the author and assets objects.

| Status | Cause                                                        |
| ------ | ------------------------------------------------------------ |
| `200`  | Always, including when GitHub is unreachable or rate limited |

This fails open: a GitHub outage returns `200` with an empty array, which is indistinguishable from a repository with no releases. The failure is only logged at debug level, so at the default log level nothing is written about it at all.

Results are cached in memory for 24 hours and mirrored to a cache file in the data directory. GitHub is contacted unauthenticated, which is 60 requests an hour, unless `GITHUB_TOKEN` is set.

## Health

These three are the endpoints to point orchestrators and uptime monitors at. All are read-only, and the only thing gating readiness is the database.

### `GET /api/health/live`

**Liveness probe that answers 200 whenever the process is running.**

Never touches the database. It reports only that the HTTP server answered, so a wedged process can be told apart from a database blip and a restart loop is not triggered by a transient database fault. Use it as a Kubernetes `livenessProbe`.

Response:

```json
{
  "status": "ok",
  "uptimeSeconds": 1234,
  "timestamp": "2026-06-05T12:00:00.000Z"
}
```

`status` is always the literal `"ok"`. There is no `database` field, unlike the readiness payload.

| Status | Cause                                                                             |
| ------ | --------------------------------------------------------------------------------- |
| `200`  | The only outcome. It can only fail to answer if the process is not serving at all |

Do not use this as an availability signal. It keeps returning `200` while `/api/health/ready` returns `503`.

### `GET /api/health/ready`

**Readiness probe that pings the database and returns 503 when it is unreachable.**

Runs a `SELECT 1` against the SQLite database. This is the endpoint the bundled Docker `HEALTHCHECK` calls, and the one to use as a Kubernetes `readinessProbe`.

Response:

```json
{
  "status": "ok",
  "uptimeSeconds": 1234,
  "database": "ok",
  "timestamp": "2026-06-05T12:00:00.000Z"
}
```

| Status | Cause                                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200`  | `SELECT 1` succeeded. `status` is `ok`, `database` is `ok`                                                                                                          |
| `503`  | `SELECT 1` threw, meaning the database file is missing, locked or corrupt, or the datasource never initialised. `status` is `degraded`, `database` is `unreachable` |

The `503` body carries the same four fields rather than a generic error envelope, so a monitor can read the reason.

This is the exception to the usual Maintainerr pattern: it fails closed with a real `503` instead of a `200` envelope. Note the limits of what it proves. `SELECT 1` shows only that the database handle answers. It does not check that migrations ran, that any table exists, or that any media server, `*arr` or Seerr upstream is reachable. External integrations are excluded on purpose so a transient upstream outage does not take Maintainerr out of rotation. `uptimeSeconds` is process uptime, not time since bootstrap finished.

### `GET /api/health`

**Combined health check that mirrors the readiness probe.**

An exact alias of `GET /api/health/ready`: same database check, same payload, same `503`. It exists for simple monitors that do not distinguish liveness from readiness.

| Status | Cause                |
| ------ | -------------------- |
| `200`  | `SELECT 1` succeeded |
| `503`  | `SELECT 1` threw     |

## Tasks

### `GET /api/tasks/{id}/status`

**Report whether a named scheduled task is currently running and since when.**

Looks the task up by name and returns its running flag. Nothing is read from the database and the cron schedule is not consulted.

| Parameter | Type   | Required | Description                                                               |
| --------- | ------ | -------- | ------------------------------------------------------------------------- |
| `id`      | string | Yes      | The task **name**, not a numeric id. Matched exactly and case-sensitively |

Valid names are `Collection Handler`, `Collection Log Cleaner`, `Rule Maintenance`, `Overlay Handler`, `Notification Timer`, `Version Notification` and `Telemetry Ping`. They contain spaces, so strict clients must percent-encode the segment.

Response:

```json
{
  "time": "2026-06-05T12:00:00.000Z",
  "running": false,
  "runningSince": null
}
```

`time` is the server clock at the moment of the call, which lets a client discard out-of-order updates. `runningSince` is `null` while the task is idle.

| Status | Cause                                       |
| ------ | ------------------------------------------- |
| `200`  | The task exists, running or not             |
| `404`  | No task is registered under that exact name |

The state is per process and in memory, so after a restart every task reports `running: false` until it next runs. Tasks are registered during bootstrap with retries, so a request in the first seconds after start can `404` for a task that will exist shortly.

`Rule Handler` is not a valid name. Rule execution moved to per rule group cron jobs that never enter this map. Use [`GET /api/rules/execute/status`](./rules.md#get-apirulesexecutestatus) for rule run state instead.
