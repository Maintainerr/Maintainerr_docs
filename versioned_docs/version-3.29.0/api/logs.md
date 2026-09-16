---
slug: /api/logs
title: Logs API
description: Live log stream, rotated log files, client error reporting, and log level settings.
---

Read the server log, download rotated log files, and change the log level and rotation settings.

See [API conventions](../API.md#api-conventions) for the rules that apply across the API.

## Reading logs

### `GET /api/logs/stream`

**Open a Server-Sent Events stream that replays the tail of the current log file and then pushes every new log line live.**

Headers flush immediately, then the last 200 lines of the newest log file are replayed, then every new record is forwarded as it is written. A `: ping` comment is sent every 30 seconds to keep the connection alive.

Each message is a `log` event:

```text
event: log
data: {"message":"Collection handler finished","date":"2026-06-05T12:00:00.000Z","level":"INFO"}

```

| Status | Cause                                                                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `200`  | Stream opened. Headers flush before any work, so later failures close or truncate the stream rather than change the status |

Level filtering happens before the stream, so it honours the level actually in force. Remember that `LOG_LEVEL` in the environment beats the saved setting.

A few things to expect. Live events uppercase the level, while replayed lines keep whatever case is in the file. Only files ending in `.log` are replayed, so compressed `.gz` archives never appear in the replay. Replayed lines that do not parse are silently dropped, and if the log directory cannot be read the stream simply starts empty rather than failing.

There is no `Last-Event-ID` support, so a reconnect replays the same last 200 lines again. Stack traces arrive folded into `message` rather than as a separate field. Timestamps in the file are parsed as local time, so a server in a different time zone from the reader looks shifted.

### `GET /api/logs/files`

**List the rotated log files on disk with their sizes.**

A directory listing only. No log content is opened or parsed.

Response:

```json
[
  { "name": "maintainerr-2026-06-05.log", "size": 20480 },
  { "name": "maintainerr-2026-06-04.log.gz", "size": 2048 }
]
```

`size` is in bytes, and a `.gz` entry reports its compressed size. Order is ascending, so oldest first. There is no server-side paging, limit or offset.

| Status | Cause                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| `200`  | Listing returned, possibly empty                                                                                     |
| `500`  | The log directory could not be read, or a listed file could not be inspected because rotation removed it mid-request |

Only Maintainerr's own daily files are listed. Anything else in the directory is invisible here, including the rotation bookkeeping file.

:::note DATA_DIR is ignored here
In production this route reads `/opt/data/logs` directly and does not honour `DATA_DIR`. If you have moved your data directory, this list will not reflect it.
:::

### `GET /api/logs/files/{file}`

**Download one rotated log file as an attachment.**

| Parameter | Type   | Required | Description                                                                                               |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------- |
| `file`    | string | Yes      | A bare log filename such as `maintainerr-2026-06-05.log` or `maintainerr-2026-06-05.log.gz`. Never a path |

Returns the raw file with `Content-Disposition: attachment`. A `.log` file is served as `text/plain` and a `.log.gz` as `application/gzip`. Archives are not decompressed for you.

| Status | Cause                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200`  | File streamed                                                                                                                                     |
| `400`  | `Invalid file`: the name does not match the expected pattern, or the path is a symlink, not a regular file, or resolves outside the log directory |
| `404`  | `File not found`                                                                                                                                  |
| `500`  | The file could not be inspected for a reason other than not existing, such as a permissions problem                                               |

Path traversal is blocked in four independent ways, so `..` segments, absolute paths and symlink bait all come back as `400`, not `404`.

Errors here use the standard error envelope, not Maintainerr's `status` and `code` envelope. There is no `Content-Length` and no range support, so a download cannot be resumed, and a read failure after the stream started truncates an already-successful response rather than changing the status. A file listed by `GET /api/logs/files` can still `404` here if rotation removed it in between.

## Log settings

### `GET /api/logs/settings`

**Return the saved log level, rotation size and backup count.**

Response:

```json
{ "level": "info", "max_size": 20, "max_files": 7 }
```

`level` is one of `debug`, `verbose`, `info`, `warn`, `error` or `fatal`. `max_size` is megabytes per file before rotation. `max_files` is the retention count.

| Status | Cause                       |
| ------ | --------------------------- |
| `200`  | Settings returned           |
| `500`  | The settings row is missing |

:::caution This is the saved value, not the effective one
`LOG_LEVEL` in the environment overrides the saved level for the whole process lifetime. When it is set, this route still reports the stored value while the running logger uses the environment one. No endpoint reports the effective level.
:::

### `POST /api/logs/settings`

**Save the log level, rotation size and retention.**

This is a full replace, not a partial update. All three fields are required.

Request body:

```json
{ "level": "info", "max_size": 20, "max_files": 7 }
```

| Field       | Type   | Required | Description                                                 |
| ----------- | ------ | -------- | ----------------------------------------------------------- |
| `level`     | string | Yes      | One of `debug`, `verbose`, `info`, `warn`, `error`, `fatal` |
| `max_size`  | number | Yes      | Megabytes per file before rotation. Minimum `0`             |
| `max_files` | number | Yes      | Retention. Minimum `1`                                      |

Neither number has to be a whole number, and `max_size` accepts a literal `0`.

| Status | Cause                                                                                               |
| ------ | --------------------------------------------------------------------------------------------------- |
| `201`  | Saved. **The response body is empty**, so re-read `GET /api/logs/settings` if you want confirmation |
| `400`  | Validation failed                                                                                   |
| `500`  | The save failed                                                                                     |

Only the level change takes effect immediately. The rotation size and retention are written to the database but do not apply to the running process. They take effect after a restart.

Two more things worth knowing. The running logger is updated **before** the database write, so a failed save leaves the process at the newly submitted level while `GET /api/logs/settings` keeps reporting the old one. And when `LOG_LEVEL` is set in the environment it silently wins: your value is still saved and still returned by the read route, but the running logger ignores it.

## Client errors

### `POST /api/logs/client-error`

**Record a browser-side error from the Maintainerr UI into the server log.**

The web UI calls this so front-end errors land in the same log as server errors.

Request body, none of which is required or validated:

```json
{
  "message": "Something failed",
  "details": "TypeError: undefined is not a function",
  "context": "Settings.Logs.stream",
  "stack": "..."
}
```

| Field     | Type   | Description                                                                      |
| --------- | ------ | -------------------------------------------------------------------------------- |
| `message` | string | Log message. Defaults to `Client error`                                          |
| `details` | string | Extra detail                                                                     |
| `context` | string | Where in the UI it happened. Defaults to `UI`. Also selects the level, see below |
| `stack`   | string | Accepted but **discarded**. It is never read                                     |

Response:

```json
{ "status": "OK", "code": 1, "message": "Logged" }
```

| Status | Cause                                                                   |
| ------ | ----------------------------------------------------------------------- |
| `201`  | Always, for any body including an empty one. There is no failure branch |

The `context` value picks the level. `Settings.Logs.stream` is logged at debug so a flapping connection cannot flood the log. Everything else is logged as an error. `details` is attached as metadata but none of the log formats render it, so in practice it does not appear in any output.

:::warning Anyone who can reach the port can write to your logs
The body is not validated, the route is not authenticated, and there is no rate limiting. Any caller can append arbitrary text to the log files and to every open log stream, and can choose the quieter debug level by sending the magic context value. This is one more reason not to expose Maintainerr publicly. See [Security and Authentication](../Security.md).
:::
