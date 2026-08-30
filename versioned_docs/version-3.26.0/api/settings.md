---
slug: /api/settings
title: Settings API
description: Connection settings for every integration, connection tests, and the media server switch.
---

Every integration's connection settings, the probes that test them, and the media server switch. This is the largest area of the API and the one that handles the most secrets.

See [API conventions](../API.md#api-conventions) for the rules that apply across the API.

## Secrets on this page

:::danger Per-integration reads return secrets in cleartext
`GET /api/settings` masks nine secret fields. **Every per-integration read on this page does not.** These routes return the real stored value:

`GET /api/settings/jellyfin`, `GET /api/settings/emby`, `GET /api/settings/seerr`, `GET /api/settings/tautulli`, `GET /api/settings/tracearr`, `GET /api/settings/tmdb`, `GET /api/settings/tvdb`, `GET /api/settings/download-client`, and the three `*arr` list routes.

`GET /api/settings/database/download` goes further and hands over the entire database, including every secret in plaintext.

This is deliberate, because the settings forms have to read a value back in order to save it again. But combined with the API having no authentication, it means anyone who can reach the port can read every credential you have stored. See [Security and Authentication](../Security.md).
:::

:::warning Never post a masked value back
There is **no masked-value detection anywhere** on the write side. If you read a body from `GET /api/settings`, which masks, and post it back, the literal mask string is stored over your real secret.

The TMDB and TVDB write routes are the exception, since they validate the key before saving, so a mask fails the check and the stored key survives. Everything else stores whatever it is given.

Read from the per-integration route, not from `GET /api/settings`, when you intend to write the value back.
:::

## Response shapes

Most routes here answer with `status`, `code` and `message`:

```json
{ "status": "OK", "code": 1, "message": "Success" }
```

Failures usually arrive as `200` or `201` with `status: "NOK"` and `code: 0`, so check the body rather than the status line. The connection test routes put the discovered version string in `message` on success rather than the word `Success`.

Successful `POST` requests answer `201`. `PATCH`, `PUT` and `DELETE` answer `200`.

## Core settings

### `GET /api/settings`

**Return the application settings with secret fields masked.**

This is the backbone read for the whole UI. It returns the full settings row: application title and URL, the Maintainerr API key, the active media server type, every integration's connection fields, both cron schedules, the `*arr` exclusion tag options and the telemetry flag.

| Status                     | Cause                      |
| -------------------------- | -------------------------- |
| `200`                      | The settings               |
| `200` with an empty body   | No settings row exists yet |
| `200` with `status: "NOK"` | The database read failed   |

Nine fields are masked: the Plex token, the Jellyfin, Emby, Seerr, TMDB, TVDB, Tautulli and Tracearr API keys, and the download client password. A value of six characters or fewer becomes `****`, anything longer becomes the first three characters, an ellipsis, then the last three.

:::caution Two secrets are not masked here
`apikey`, the Maintainerr API key itself, and `download_client_username` are returned in the clear.
:::

This response cannot be safely round-tripped. See the warning above.

### `POST /api/settings`

**Merge a partial settings payload over the stored row and re-initialise every dependent client.**

Every field is optional, and an absent field is left as-is. Accepted fields include `applicationTitle`, `applicationUrl`, `apikey`, `media_server_type`, the Plex connection fields, every integration URL and key, `collection_handler_job_cron`, `rules_handler_job_cron`, the download client options, and the `*arr` exclusion tag options.

`id` and `telemetryEnabled` are deliberately rejected. Telemetry has its own route.

| Status                     | Cause                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `201`                      | Success, **and every in-band failure below**                                                                                                             |
| `400`                      | Validation failed, such as a URL with no `http://` or `https://` scheme                                                                                  |
| `201` with `status: "NOK"` | `No settings found to update`, `Update failed, invalid CRON value was found`, `Authenticate with Plex before saving Plex server settings.`, or `Failure` |

Saving re-initialises the media server adapter, Seerr, Tautulli, the download client and the internal client, re-times the collection handler cron job if its schedule changed, and re-times the rules cron job the same way.

Some normalisation runs on **every** save, even one that touches unrelated fields: the Plex hostname is trimmed, lowercased and stripped of a scheme prefix, `plex_ssl` is forced on for an `https://` hostname or port 443 and off for `http://`, and the Seerr and Tautulli URLs are lowercased. Trailing slashes are stripped from service URLs rather than rejected.

:::danger This route can change your active media server
`media_server_type` is accepted here, so a client can flip the active media server through this route and **bypass everything `POST /api/settings/media-server/switch` does**: no data is cleared, the old server's credentials are not nulled, and no adapter is torn down.

You can end up with one server active while another server's credentials and its collections are still in place. Use the switch route.
:::

Because the whole save is wrapped in one error handler, a failure that happens after the row was written still reports `Failure` even though the write landed.

### `PATCH /api/settings`

**Merge a partial settings payload over the stored row.**

Identical to `POST /api/settings` in body, behaviour and side effects. This is the verb the web UI actually uses.

| Status                     | Cause                                  |
| -------------------------- | -------------------------------------- |
| `200`                      | Success, and every in-band failure     |
| `400`                      | Validation failed                      |
| `200` with `status: "NOK"` | Same four messages as the `POST` route |

Unknown keys are stripped rather than rejected. The same media server type trap applies.

### `GET /api/settings/version`

**Return the running application version string.**

The response is a bare string, not JSON.

| Status | Cause  |
| ------ | ------ |
| `200`  | Always |

The value comes only from the environment. A process started without npm reports `0.0.0`, so this is not a reliable build identifier. Use [`GET /api/app/status`](./app-and-health.md#get-apiappstatus) for the richer version payload.

### `GET /api/settings/api/generate`

**Generate a fresh Maintainerr API key string without storing it.**

The response is a bare base64 string.

| Status | Cause  |
| ------ | ------ |
| `200`  | Always |

This does **not** save the key. To store it, send the value back as `apikey` through `PATCH /api/settings`.

:::caution This does not protect anything
Nothing server-side validates an inbound API key. The key exists so Maintainerr's own internal client can call its own API. Generating a new one does not add authentication, and both this route and the key itself are unauthenticated.
:::

### `GET /api/settings/test/setup`

**Report whether the required media server settings are filled in.**

The response is a bare boolean.

| Status | Cause                                             |
| ------ | ------------------------------------------------- |
| `200`  | Always. Any internal error is reported as `false` |

"Setup complete" means the fields are populated, **not** that the server is reachable. No connection is attempted. Plex needs a hostname, name, port and token. Jellyfin and Emby need a URL and API key. The user id is optional for both because it can be detected later.

### `POST /api/settings/cron/validate`

**Report whether a cron expression parses, without storing it.**

Request body:

```json
{ "schedule": "0 0-23/12 * * *" }
```

| Status | Cause                                                                     |
| ------ | ------------------------------------------------------------------------- |
| `201`  | For **both** answers. Valid is `status: "OK"`, invalid is `status: "NOK"` |
| `400`  | `schedule` is missing or not a string                                     |

The expression must be exactly 5 fields. A seconds field, month or day names, a `?` blank day, and `7` for Sunday are all rejected.

### `GET /api/settings/database/download`

**Stream the live database file as an attachment.**

| Status | Cause                                                          |
| ------ | -------------------------------------------------------------- |
| `200`  | The file is streamed                                           |
| `404`  | `Database file not found`, meaning it is missing or unreadable |
| `500`  | The database is not file-based                                 |

:::danger This hands over every secret you have stored
The downloaded database contains the Plex token, every `*arr` and integration API key, the download client password and the Maintainerr API key, **all in plaintext**. It completely bypasses the masking on `GET /api/settings`, and like everything else it is unauthenticated.

Treat the exposure of this one route as equivalent to exposing every credential Maintainerr holds.
:::

The file is copied as it currently sits on disk, with no locking or checkpointing, so a copy taken mid-write is possible.

## Media servers

### `GET /api/settings/plex/devices/servers`

**List the owned Plex servers on the account, with each connection probed and ranked.**

Reads the account's server list from plex.tv using the stored token, then makes a live request to **every advertised connection of every owned server** to find which are reachable. Unreachable connections are dropped and the rest are ranked, preferring local direct addresses.

| Status | Cause                                           |
| ------ | ----------------------------------------------- |
| `200`  | An array of servers, **or `[]` on any failure** |

An empty array conflates "no owned servers" with "plex.tv is down" and "no token stored". There is no error status.

This is the slow route on this page, because of the per-connection probing.

### `POST /api/settings/plex/token`

**Store a Plex auth token obtained from the sign-in flow.**

Request body:

```json
{ "plex_auth_token": "..." }
```

| Status                     | Cause                                                   |
| -------------------------- | ------------------------------------------------------- |
| `201`                      | Stored                                                  |
| `400`                      | The token is missing or blank                           |
| `201` with `status: "NOK"` | The write failed. The message is the bare word `Failed` |

The token is stored as given and is **not** verified against plex.tv here. Use `GET /api/settings/test/plex/auth` to check it.

### `DELETE /api/settings/plex/auth`

**Clear the stored Plex auth token and tear down the Plex clients.**

| Status                     | Cause                                         |
| -------------------------- | --------------------------------------------- |
| `200`                      | Cleared                                       |
| `200` with `status: "NOK"` | The write failed, or there is no settings row |

:::warning Destructive
Deletes the stored Plex token. **Maintainerr keeps no copy**, so recovering means signing in to Plex again.

Only the token is removed. The hostname, port, SSL flag, server name and machine id all stay, so your server selection survives and comes back once a new token is stored.

No collections, rules or exclusions are touched.
:::

Afterwards, the media server becomes unavailable to Maintainerr until a new token is saved.

### `GET /api/settings/test/plex`

**Probe the configured Plex server and return its version.**

| Status                     | Cause                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `200` with `status: "OK"`  | Connected. `message` is the Plex version                                                                           |
| `200` with `status: "NOK"` | `Authenticate with Plex before testing the connection.` when no token is stored, otherwise the bare word `Failure` |

This never returns an HTTP error. Note that a `Failure` conflates an unreachable server with a client that was never started, so it gives you little to diagnose with.

It tests whatever connection the process currently holds, which is not necessarily the hostname you most recently saved. Save first, then test.

### `GET /api/settings/test/plex/auth`

**Validate the stored Plex token against plex.tv.**

| Status                                             | Cause                                                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `200` with `status: "OK"`                          | The token is valid                                                                                                               |
| `200` with `status: "NOK"`                         | `Authenticate with Plex before validating the connection.`, or `Stored Plex credentials are invalid. Re-authenticate with Plex.` |
| `200` with `status: "NOK"` and `unreachable: true` | plex.tv could not be reached. **Your saved token is still in use**                                                               |

The three-way answer is the point of this route. Only a genuine rejection from plex.tv means the token is bad. Anything else, including a rate limit or a server error, sets `unreachable` so a transient outage is not mistaken for an invalid token.

Nothing is written here, so an invalid token stays stored until you delete it.

### `GET /api/settings/jellyfin`

**Return the stored Jellyfin URL, API key and user id.**

| Status                     | Cause                                           |
| -------------------------- | ----------------------------------------------- |
| `200`                      | The settings, **with the API key in cleartext** |
| `200` with `status: "NOK"` | The read failed                                 |

An unconfigured install returns nulls despite the declared type. `jellyfin_server_name` is stored but not returned here.

### `POST /api/settings/jellyfin`

**Test, then store Jellyfin credentials and make Jellyfin the active media server.**

Request body:

```json
{
  "jellyfin_url": "http://jellyfin:8096",
  "jellyfin_api_key": "...",
  "jellyfin_user_id": ""
}
```

`jellyfin_user_id` is optional. An empty value triggers automatic detection of an admin user.

| Status                     | Cause                                                                          |
| -------------------------- | ------------------------------------------------------------------------------ |
| `201`                      | Saved                                                                          |
| `201` with `status: "NOK"` | The connection test failed, the chosen user is not an admin, or the save threw |
| `400`                      | Validation failed                                                              |

The save is gated on a live connection test, so unreachable credentials cannot be stored.

:::warning This changes your active media server
Saving here flips the active media server to Jellyfin **without going through the switch route**. Plex and Emby credentials are not cleared, and no collections, rules or exclusions are touched.

You can end up with Jellyfin active alongside stale credentials and collections shaped for another server. Use `POST /api/settings/media-server/switch` for a real switch.
:::

Saving also re-initialises Streamystats, because it authenticates with the Jellyfin API key.

The connection probe sets no timeout, so this can hang for a while against an unresponsive host.

### `POST /api/settings/jellyfin/test`

**Probe a Jellyfin server with supplied credentials.**

Takes the same body as the save route. Nothing is stored.

| Status                     | Cause                                                                            |
| -------------------------- | -------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | Connected. `message` names the server, and `users` lists **administrators only** |
| `201` with `status: "NOK"` | Any failure                                                                      |
| `400`                      | Validation failed                                                                |

Testing is effectively a prerequisite for choosing a user, because the save route validates the user id against this same admin-only list.

Note the message `Invalid API key` is returned for **any** error on the user lookup, not just an authentication failure.

### `DELETE /api/settings/jellyfin`

**Clear the stored Jellyfin credentials.**

| Status                     | Cause            |
| -------------------------- | ---------------- |
| `200`                      | Cleared          |
| `200` with `status: "NOK"` | The write failed |

:::warning Destructive, and it cascades
Clears the Jellyfin URL, API key, user id and server name. **It also clears your Streamystats URL**, because Streamystats authenticates with the Jellyfin key and would otherwise be left half configured. Nothing in the response tells you this happened.

Maintainerr keeps no copy of any of it.

It does **not** reset the active media server type, so the install is left reporting Jellyfin as active with no credentials behind it. Collections, membership, exclusions and rule groups are untouched.
:::

### `GET /api/settings/emby`

**Return the stored Emby URL, API key and user id.**

| Status                     | Cause                                           |
| -------------------------- | ----------------------------------------------- |
| `200`                      | The settings, **with the API key in cleartext** |
| `200` with `status: "NOK"` | The read failed                                 |

If the login flow was used, the stored API key is a live Emby access token.

### `POST /api/settings/emby`

**Test, then store Emby credentials and make Emby the active media server.**

Takes `emby_url`, `emby_api_key` and an optional `emby_user_id`.

| Status                     | Cause                                                                          |
| -------------------------- | ------------------------------------------------------------------------------ |
| `201`                      | Saved                                                                          |
| `201` with `status: "NOK"` | The connection test failed, the chosen user is not an admin, or the save threw |
| `400`                      | Validation failed                                                              |

:::warning This changes your active media server
The same trap as the Jellyfin save. It flips the active media server to Emby without clearing anything. Use the switch route for a real switch.
:::

Unlike Jellyfin, there is no automatic admin detection. Leaving `emby_user_id` empty stores no user, and an administrator is resolved lazily when first needed.

:::caution A user picked after login can be rejected here
The admin check compares against the **admin-only** list from `POST /api/settings/emby/test`, while `POST /api/settings/emby/login` returns **every** user unfiltered. Choosing a non-admin from the login response fails at save time with `Selected Emby user must be an admin.`
:::

### `POST /api/settings/emby/test`

**Probe an Emby server with an API key.**

Takes the same body as the save route. Nothing is stored.

| Status                     | Cause                                            |
| -------------------------- | ------------------------------------------------ |
| `201` with `status: "OK"`  | Connected. `users` lists **administrators only** |
| `201` with `status: "NOK"` | Any failure                                      |
| `400`                      | Validation failed                                |

### `POST /api/settings/emby/login`

**Authenticate against an Emby server with an admin username and password.**

Request body:

```json
{ "emby_url": "http://emby:8096", "username": "admin", "password": "..." }
```

On success the response carries `token`, `userId`, `serverName`, `users` and `libraries`.

| Status                     | Cause                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | Authenticated                                                                                                                      |
| `201` with `status: "NOK"` | `Invalid Emby username or password`, `User authenticated but is not an administrator on this Emby server`, or a connection failure |
| `400`                      | Validation failed                                                                                                                  |

Nothing is stored in Maintainerr. To keep the token, send it to `POST /api/settings/emby` as `emby_api_key`.

:::danger Cleartext credentials in both directions
The request carries an admin password in the clear, over whatever scheme you supply, and `http://` is accepted. The response hands back a **live Emby access token** in the clear.

There is no authentication in front of this route, so anyone who can reach the Maintainerr API can use it to test credentials against, or relay them to, any Emby server they can reach from your host.
:::

This does have a real effect on the Emby side: it mints a genuine access token and registers a device session that shows up in Emby's active devices list. Clearing the key in Maintainerr does not revoke that session, which must be removed in Emby.

`users` here is unfiltered, unlike the test route.

### `DELETE /api/settings/emby`

**Clear the stored Emby credentials.**

| Status                     | Cause            |
| -------------------------- | ---------------- |
| `200`                      | Cleared          |
| `200` with `status: "NOK"` | The write failed |

:::warning Destructive
Clears the Emby URL, API key, user id and server name, with no copy kept.

Unlike the Jellyfin delete this does **not** cascade to any other integration, because Streamystats is Jellyfin only.

It does **not** reset the active media server type, so the install is left reporting Emby as active with no credentials behind it. Collections, membership, exclusions and rule groups are untouched.
:::

If the stored key was an access token minted by the login route, clearing it here does **not** revoke the session on the Emby server. Remove that from Emby's device list separately.

### `GET /api/settings/media-server/switch/preview/{targetServerType}`

**Report what a switch would clear, keep and migrate.**

| Parameter          | Type | Required | Description                  |
| ------------------ | ---- | -------- | ---------------------------- |
| `targetServerType` | path | Yes      | `plex`, `jellyfin` or `emby` |

The response carries `currentServerType`, `targetServerType`, `dataToBeCleared` with counts, `dataToBeKept`, and `ruleMigration` with counts and a per-rule list of what could not carry over.

| Status | Cause                                   |
| ------ | --------------------------------------- |
| `200`  | The preview                             |
| `400`  | The target type is not one of the three |
| `500`  | The analysis threw                      |

Nothing is written and no media server is contacted.

:::caution The counts ignore rule migration
`dataToBeCleared.collections` counts collections as cleared even when you intend to switch with migration on, in which case they are reset rather than deleted.

`ruleMigration` is omitted entirely on a fresh install with no current server.
:::

### `POST /api/settings/media-server/switch`

**Switch the active media server type, wiping media-server-specific data and the old server's credentials.**

Request body:

```json
{ "targetServerType": "jellyfin", "migrateRules": true }
```

| Status                     | Cause                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `201`                      | Switched. The body carries `clearedData` and, with migration, `ruleMigration`                            |
| `201` with `status: "NOK"` | `Already using <type> as media server`, so nothing was cleared, or the switch failed and was rolled back |
| `400`                      | Validation failed                                                                                        |
| `409`                      | `A media server switch is already in progress`                                                           |

:::danger Destructive: this is the most far-reaching route in the API
In one transaction it **permanently deletes all collection membership, every collection log and every exclusion**.

Without `migrateRules` it also **deletes every rule group, its rules, and every collection**, and then deletes each collection's stored poster from disk.

With `migrateRules` it instead keeps rule groups and collections, rewriting rules for the target server, but **deactivates every rule group and clears its library**, so nothing runs until you reassign libraries.

It then clears the departing server's credentials: leaving Plex nulls the Plex fields **and your Tautulli URL and API key**; leaving Jellyfin nulls the Jellyfin fields **and your Streamystats URL**; leaving Emby nulls the Emby fields. The Tracearr server binding is cleared in every case.

**None of this can be undone.** Take a backup with `GET /api/settings/database/download` first. No media files are deleted and nothing leaves your library.
:::

While a switch is running, media server routes answer `503`.

:::caution Even a rejected same-type switch opens the switch window
The "already using" check runs after the switch has been marked as in progress, so a rejected request still briefly makes media server routes answer `503`.

On a fresh install with no current type the check is skipped and the clearing path still runs. That is harmless on an empty database, but the initial setup click goes through the same code.
:::

Note the alternative way in: `POST` and `PATCH /api/settings` accept `media_server_type` directly and do **none** of this.

## Media managers

Radarr, Sonarr and Sportarr are configured as lists of instances, and the four routes for each behave identically. What follows applies to all three.

**The list route** returns every configured instance as `id`, `serverName`, `url` and `apiKey`, with the **API key in cleartext**. It answers `200` even on failure, in which case the body is an error envelope object rather than an array, so check the shape before iterating.

**The create and update routes** take `serverName`, `url` and `apiKey`, all required. The URL is **forced to lowercase** when stored, which breaks an instance behind a case-sensitive reverse proxy path. Credentials are stored verbatim and unverified, so test first if you want verification. Duplicate names and URLs are allowed.

**The update route** is a full replace, not a partial update, and the id in the path wins over any id in the body. It has no existence check: updating an id that does not exist **creates a row with that id** rather than failing.

**The delete route** refuses while any collection still references the instance, and returns the offending collections so you can see which. Deleting an id that does not exist reports a generic failure rather than a `404`.

The `{id}` in these paths is Maintainerr's own settings row id.

### `GET /api/settings/radarr`

**List every configured Radarr instance.**

| Status | Cause                                                                      |
| ------ | -------------------------------------------------------------------------- |
| `200`  | The instances, **with API keys in cleartext**, or an error envelope object |

### `POST /api/settings/radarr`

**Create a new Radarr instance.**

| Status                     | Cause                                                                 |
| -------------------------- | --------------------------------------------------------------------- |
| `201`                      | Created. The body carries the new instance including its generated id |
| `201` with `status: "NOK"` | The write failed                                                      |
| `400`                      | Validation failed                                                     |

### `PUT /api/settings/radarr/{id}`

**Overwrite one Radarr instance's name, URL and API key.**

| Status                     | Cause                                        |
| -------------------------- | -------------------------------------------- |
| `200`                      | Updated                                      |
| `200` with `status: "NOK"` | The write failed                             |
| `400`                      | `id` is not an integer, or validation failed |

The cached client for that instance is rebuilt so later runs use the new details.

### `DELETE /api/settings/radarr/{id}`

**Delete a Radarr instance, refusing while collections still reference it.**

| Status                     | Cause                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200` with `status: "OK"`  | Deleted                                                                                                                                                                    |
| `200` with `status: "NOK"` | Blocked with `Cannot delete setting with associated collections`, and `data.collectionsInUse` lists them. Or a generic `Failure`, which is also what an unknown id returns |
| `400`                      | `id` is not an integer                                                                                                                                                     |

:::warning Destructive
Permanently deletes the instance row, including its API key. **Maintainerr keeps no copy.**

Nothing cascades: the in-use check is what stops a collection being left pointing at a missing instance. Nothing is deleted in Radarr itself.
:::

### `GET /api/settings/sonarr`

**List every configured Sonarr instance.**

| Status | Cause                                                                      |
| ------ | -------------------------------------------------------------------------- |
| `200`  | The instances, **with API keys in cleartext**, or an error envelope object |

### `POST /api/settings/sonarr`

**Create a new Sonarr instance.**

| Status                     | Cause             |
| -------------------------- | ----------------- |
| `201`                      | Created           |
| `201` with `status: "NOK"` | The write failed  |
| `400`                      | Validation failed |

### `PUT /api/settings/sonarr/{id}`

**Overwrite one Sonarr instance's name, URL and API key.**

| Status                     | Cause                                        |
| -------------------------- | -------------------------------------------- |
| `200`                      | Updated                                      |
| `200` with `status: "NOK"` | The write failed                             |
| `400`                      | `id` is not an integer, or validation failed |

### `DELETE /api/settings/sonarr/{id}`

**Delete a Sonarr instance, refusing while collections still reference it.**

| Status                     | Cause                                                     |
| -------------------------- | --------------------------------------------------------- |
| `200` with `status: "OK"`  | Deleted                                                   |
| `200` with `status: "NOK"` | Blocked with the collections listed, or a generic failure |
| `400`                      | `id` is not an integer                                    |

:::warning Destructive
Permanently deletes the instance row, including its API key, with no copy kept. Nothing is deleted in Sonarr itself.
:::

### `GET /api/settings/sportarr`

**List every configured Sportarr instance.**

| Status | Cause                                                                      |
| ------ | -------------------------------------------------------------------------- |
| `200`  | The instances, **with API keys in cleartext**, or an error envelope object |

### `POST /api/settings/sportarr`

**Create a new Sportarr instance.**

| Status                     | Cause             |
| -------------------------- | ----------------- |
| `201`                      | Created           |
| `201` with `status: "NOK"` | The write failed  |
| `400`                      | Validation failed |

:::caution The version requirement is not enforced here
Only `POST /api/settings/test/sportarr` checks the minimum supported Sportarr version. Saving without testing stores an unsupported instance happily.
:::

### `PUT /api/settings/sportarr/{id}`

**Overwrite one Sportarr instance's name, URL and API key.**

| Status                     | Cause                                        |
| -------------------------- | -------------------------------------------- |
| `200`                      | Updated                                      |
| `200` with `status: "NOK"` | The write failed                             |
| `400`                      | `id` is not an integer, or validation failed |

### `DELETE /api/settings/sportarr/{id}`

**Delete a Sportarr instance, refusing while collections still reference it.**

| Status                     | Cause                                                     |
| -------------------------- | --------------------------------------------------------- |
| `200` with `status: "OK"`  | Deleted                                                   |
| `200` with `status: "NOK"` | Blocked with the collections listed, or a generic failure |
| `400`                      | `id` is not an integer                                    |

:::warning Destructive
Permanently deletes the instance row, including its API key, with no copy kept. Nothing is deleted in Sportarr itself.
:::

### `POST /api/settings/test/radarr`

**Probe a Radarr connection using credentials in the body, without saving.**

Takes the same body as the save route, including `serverName`, which the probe does not use.

| Status                     | Cause                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | Connected. `message` is the Radarr version                                                        |
| `201` with `status: "NOK"` | `Failure`, or `Unexpected application name returned: <name>` when a different application answers |
| `400`                      | Validation failed                                                                                 |

Real connection failures come back as the bare word `Failure` with no detail, because the underlying error is swallowed before it can be classified.

Testing is not a precondition for saving.

### `POST /api/settings/test/sonarr`

**Probe a Sonarr connection using credentials in the body, without saving.**

| Status                     | Cause                                        |
| -------------------------- | -------------------------------------------- |
| `201` with `status: "OK"`  | Connected. `message` is the Sonarr version   |
| `201` with `status: "NOK"` | `Failure`, or an unexpected application name |
| `400`                      | Validation failed                            |

A Radarr behind the URL is rejected by name.

### `POST /api/settings/test/sportarr`

**Probe a Sportarr connection and enforce the minimum supported version, without saving.**

| Status                     | Cause                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | Connected. `message` is the Sportarr version                                                                                                |
| `201` with `status: "NOK"` | `Failure`, an unexpected application name, or `Sportarr <version> is below the minimum supported version 4.0.1022. Please update Sportarr.` |
| `400`                      | Validation failed                                                                                                                           |

This is the only place the version requirement is applied. A build whose version cannot be parsed passes the check.

## Requests

The three Seerr settings routes each answer on `/api/settings/seerr`, `/api/settings/overseerr` and `/api/settings/jellyseerr`. They are aliases of one handler with one storage location, and `/api/settings/seerr` is canonical.

### `GET /api/settings/seerr`

**Return the stored Seerr URL and API key.**

| Status                     | Cause                                           |
| -------------------------- | ----------------------------------------------- |
| `200`                      | The settings, **with the API key in cleartext** |
| `200` with `status: "NOK"` | The read failed                                 |

### `POST /api/settings/seerr`

**Store the Seerr URL and API key.**

Request body needs both `url` and `api_key`.

| Status                     | Cause             |
| -------------------------- | ----------------- |
| `201`                      | Saved             |
| `201` with `status: "NOK"` | The write failed  |
| `400`                      | Validation failed |

The connection is stored **unverified**. Use `POST /api/settings/test/seerr` first if you want verification.

Both fields are required together, so you cannot clear Seerr here. Use the `DELETE` route.

### `DELETE /api/settings/seerr`

**Clear the stored Seerr settings.**

| Status                     | Cause            |
| -------------------------- | ---------------- |
| `200`                      | Cleared          |
| `200` with `status: "NOK"` | The write failed |

:::warning Destructive
Clears the Seerr URL and API key, with no copy kept. The Seerr client is dropped, so nothing queries Seerr afterwards.

Rules that read Seerr values are not deleted or rewritten. They simply stop resolving.
:::

### `POST /api/settings/test/seerr`

**Probe a Seerr instance with supplied credentials, without saving.**

Also answers on the `/api/settings/test/overseerr` and `/api/settings/test/jellyseerr` aliases.

| Status                     | Cause                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `201` with `status: "OK"`  | Connected. `message` is the Seerr version                                                                                                  |
| `201` with `status: "NOK"` | `Failure, an unexpected response was returned. The URL is likely incorrect.`, or a classified connection failure such as `Invalid API key` |
| `400`                      | Validation failed                                                                                                                          |

There is no "test what is currently stored" mode. Both fields are required in the body.

:::caution This sends your credentials to whatever host you name
The URL and key both come from the request body, so this route makes the server contact any address you supply. Private addresses are deliberately allowed, since self-hosted services need them. Combined with the lack of authentication, that makes this a way to have your server issue requests on someone else's behalf.
:::

## Watch statistics

### `GET /api/settings/tautulli`

**Return the stored Tautulli URL and API key.**

| Status                     | Cause                                           |
| -------------------------- | ----------------------------------------------- |
| `200`                      | The settings, **with the API key in cleartext** |
| `200` with `status: "NOK"` | The read failed                                 |

### `POST /api/settings/tautulli`

**Store the Tautulli URL and API key.**

Both `url` and `api_key` are required.

| Status                     | Cause             |
| -------------------------- | ----------------- |
| `201`                      | Saved             |
| `201` with `status: "NOK"` | The write failed  |
| `400`                      | Validation failed |

Stored unverified. Test first if you want verification.

### `DELETE /api/settings/tautulli`

**Clear the stored Tautulli connection.**

| Status                     | Cause            |
| -------------------------- | ---------------- |
| `200`                      | Cleared          |
| `200` with `status: "NOK"` | The write failed |

:::warning Destructive
Clears the Tautulli URL and API key, with no copy kept, and drops the client so nothing queries Tautulli afterwards.

Rules that read Tautulli values are not deleted or rewritten. They stop resolving, which for a watch-count rule means no value rather than zero.

There is no confirmation step: one unauthenticated request wipes the integration.
:::

### `POST /api/settings/test/tautulli`

**Probe a Tautulli URL and API key, without saving.**

| Status                     | Cause                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | Connected. `message` is the Tautulli version                                                                                                   |
| `201` with `status: "NOK"` | Tautulli's own error message, `Failure, an unexpected response was returned. The URL is likely incorrect.`, or a classified connection failure |
| `400`                      | Validation failed                                                                                                                              |

The same caveat as the Seerr test applies: the credentials in the body are sent to the host in the body.

### `GET /api/settings/streamystats`

**Return the stored Streamystats URL.**

Streamystats has no key of its own. It reuses the Jellyfin API key.

| Status                     | Cause                                                                      |
| -------------------------- | -------------------------------------------------------------------------- |
| `200`                      | The URL                                                                    |
| `200` with `status: "NOK"` | The read failed                                                            |
| `403`                      | `Streamystats is only available when Jellyfin is the active media server.` |

Note the ordering: the settings read happens **before** the Jellyfin check, so on Plex or Emby with a broken database you get the `200` envelope rather than the `403`.

### `POST /api/settings/streamystats`

**Store the Streamystats URL.**

Request body is `{ "url": "..." }` only.

| Status                     | Cause                                   |
| -------------------------- | --------------------------------------- |
| `201`                      | Saved                                   |
| `201` with `status: "NOK"` | The write failed                        |
| `400`                      | Validation failed                       |
| `403`                      | The active media server is not Jellyfin |

The URL is stored without any probe.

:::caution Saving without a Jellyfin key leaves the integration inert
The client is only built when both the Streamystats URL **and** a Jellyfin API key are present. Save a URL with no Jellyfin key and the setting persists while nothing works.
:::

### `DELETE /api/settings/streamystats`

**Clear the stored Streamystats URL.**

| Status                     | Cause                                                             |
| -------------------------- | ----------------------------------------------------------------- |
| `200`                      | Cleared                                                           |
| `200` with `status: "NOK"` | The write failed                                                  |
| `403`                      | The active media server is not Jellyfin, checked before any write |

:::warning Destructive
Clears the Streamystats URL, with no copy kept, and drops the client. Only the URL is affected, and your Jellyfin key is untouched.

Rules that read Streamystats values stop resolving rather than being removed.
:::

### `POST /api/settings/test/streamystats`

**Probe a Streamystats URL, without saving or sending any credential.**

| Status                     | Cause                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `201` with `status: "OK"`  | Connected. `message` is the Streamystats version                                                                   |
| `201` with `status: "NOK"` | `Unexpected response from Streamystats. Verify the URL points to a Streamystats instance.` or a connection failure |
| `400`                      | Validation failed                                                                                                  |
| `403`                      | The active media server is not Jellyfin                                                                            |

This is the only test route that deliberately **withholds** a stored credential from the URL you supply, so it cannot be used to leak your Jellyfin key to an arbitrary host.

A pass here does not prove the integration will work, because the live client also needs the Jellyfin API key, which this probe never exercises.

### `GET /api/settings/tracearr`

**Return the stored Tracearr URL, API key and bound server id.**

| Status                     | Cause                                           |
| -------------------------- | ----------------------------------------------- |
| `200`                      | The settings, **with the API key in cleartext** |
| `200` with `status: "NOK"` | The read failed                                 |

### `POST /api/settings/tracearr`

**Store the Tracearr connection, resolving and verifying the bound server before saving.**

Request body takes `url`, `api_key` and an optional `server_id`, which must be a UUID.

| Status                     | Cause                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `201`                      | Saved                                                                                                        |
| `201` with `status: "NOK"` | No matching Tracearr server was found, the chosen server tracks a different media server, or something threw |
| `400`                      | Validation failed                                                                                            |

This is the only write on this page that contacts external services before saving. Leave `server_id` out and Maintainerr resolves the Tracearr server that tracks your media server. Send it only when Tracearr has several servers of that type, in which case no resolution happens and the id is used as given.

The save is refused if no server matches, or if the one you named tracks a different media server. An unreadable library check does **not** block the save, so a transient failure cannot lock you out.

This can be slow: resolution probes up to 20 items per candidate server against your media server.

:::caution The version requirement is not enforced here
Only `POST /api/settings/test/tracearr` checks the minimum supported Tracearr version.
:::

### `DELETE /api/settings/tracearr`

**Clear the stored Tracearr connection and flush its cached history.**

| Status                     | Cause            |
| -------------------------- | ---------------- |
| `200`                      | Cleared          |
| `200` with `status: "NOK"` | The write failed |

:::warning Destructive
Clears the Tracearr URL, API key **and the resolved server binding**, with no copy kept, then drops the client and wipes the cached history index.

Re-adding Tracearr re-runs the whole resolve-and-verify probe. Rules that read Tracearr history are not deleted, they stop resolving.
:::

### `POST /api/settings/tracearr/servers`

**List the Tracearr servers that match your media server, for the settings picker.**

Request body takes `url` and `api_key`.

| Status | Cause                                                                            |
| ------ | -------------------------------------------------------------------------------- |
| `201`  | An array of servers with `id` and `name`. **May legitimately be empty**          |
| `400`  | Validation failed                                                                |
| `502`  | The document fetch threw, or reading item metadata from your media server failed |

An empty array is ambiguous: it can mean the document had no server list, or the media server type filter removed every candidate. If the library list cannot be read, every candidate is returned with a warning rather than an error.

### `POST /api/settings/test/tracearr`

**Probe a Tracearr URL and API key and check its version, without saving.**

| Status                     | Cause                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | Connected. `message` is the Tracearr version                                                                                                    |
| `201` with `status: "NOK"` | `Unexpected response from Tracearr. Verify the URL points to a Tracearr v2 instance.`, a below-minimum-version refusal, or a connection failure |
| `400`                      | Validation failed                                                                                                                               |

`server_id` is accepted by the schema but unused. A pass here says nothing about whether the save will find a matching server.

## Metadata providers

### `GET /api/settings/metadata-provider`

**Return which metadata provider is configured as primary.**

Response is `{ "preference": "tmdb_primary" }` or `tvdb_primary`.

| Status | Cause                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------- |
| `200`  | Always. A database failure is reported as `tmdb_primary` and is indistinguishable from a real answer |

### `POST /api/settings/metadata-provider`

**Store which metadata provider should be primary.**

Request body is `{ "preference": "tmdb_primary" }` or `tvdb_primary`.

| Status                     | Cause                                                   |
| -------------------------- | ------------------------------------------------------- |
| `201`                      | Saved                                                   |
| `201` with `status: "NOK"` | The write failed                                        |
| `400`                      | The value is missing or outside the two allowed options |

:::caution The server does not check that TVDB is configured
`tvdb_primary` is accepted with no TVDB key stored. That guard exists only in the web UI. The unavailable provider is then filtered out at lookup time, so TMDB is used anyway while the stored value says otherwise.

Deleting the TVDB key later does not reset this value either.
:::

### `GET /api/settings/tmdb`

**Return the stored TMDB API key.**

| Status                     | Cause                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `200`                      | `{ "api_key": "..." }`, **in cleartext**. A never-configured key reads back as an empty string |
| `200` with `status: "NOK"` | The read failed                                                                                |

### `POST /api/settings/tmdb`

**Validate a TMDB API key and store it if it works.**

| Status                     | Cause                                           |
| -------------------------- | ----------------------------------------------- |
| `201` with `status: "OK"`  | Stored                                          |
| `201` with `status: "NOK"` | The key was rejected, usually `Invalid API key` |
| `400`                      | The field is missing or not a string            |

The key is checked against TMDB **before** anything is written, so a wrong key cannot overwrite a working one.

:::caution Posting an empty key silently reverts to the bundled key
An empty string passes validation, and the check then falls back to the currently loaded key, which normally passes. The empty string is stored, `Success` is reported, and the running client drops back to the shared key that ships with Maintainerr.

The effect is the same as calling `DELETE`. Use `DELETE` if that is what you want.
:::

### `DELETE /api/settings/tmdb`

**Clear the stored TMDB API key and fall back to the built-in shared key.**

| Status                     | Cause            |
| -------------------------- | ---------------- |
| `200`                      | Cleared          |
| `200` with `status: "NOK"` | The write failed |

:::warning Destructive
Clears your TMDB API key, with no copy kept.

TMDB is never fully removed. It reverts to the shared key bundled with Maintainerr, so metadata lookups keep working. Your metadata provider preference is untouched.

The cached TMDB responses are not flushed. Use `POST /api/settings/metadata/refresh/tmdb` for that.
:::

### `GET /api/settings/tvdb`

**Return the stored TVDB API key.**

| Status                     | Cause                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `200`                      | `{ "api_key": "..." }`, **in cleartext**. A never-configured key reads back as an empty string |
| `200` with `status: "NOK"` | The read failed                                                                                |

### `POST /api/settings/tvdb`

**Validate a TVDB API key and store it if it works.**

| Status                     | Cause                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | Stored                                                                                          |
| `201` with `status: "NOK"` | `Invalid API key`, `No TVDB API key configured`, `Unexpected response`, or a connection failure |
| `400`                      | The field is missing or not a string                                                            |

Validated before saving, so a bad key never overwrites a good one.

:::danger Posting an empty key wipes your configured key
This is worse than the TMDB case. An empty string passes validation, the check falls back to the **already stored** key and passes, and the empty string is then stored.

`Success` is reported while your TVDB key is gone and TVDB is left unauthenticated, exactly as if you had called `DELETE`. Unlike TMDB there is no bundled fallback key. Use `DELETE` if that is what you want.
:::

### `DELETE /api/settings/tvdb`

**Clear the stored TVDB API key and drop the session.**

| Status                     | Cause            |
| -------------------------- | ---------------- |
| `200`                      | Cleared          |
| `200` with `status: "NOK"` | The write failed |

:::warning Destructive
Clears your TVDB API key, with no copy kept, and discards the session token. **Unlike TMDB there is no bundled fallback**, so the TVDB provider becomes unavailable entirely.

Your metadata provider preference is **not** reset. An install left on `tvdb_primary` keeps that value with no usable provider behind it.

Cached TVDB responses are not flushed.
:::

### `POST /api/settings/test/tmdb`

**Test a TMDB API key, without saving it.**

| Status                     | Cause                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | The key works                                                                                   |
| `201` with `status: "NOK"` | `Invalid API key`, `No TMDB API key configured`, `Unexpected response`, or a connection failure |
| `400`                      | The field is missing or not a string                                                            |

An empty key re-tests whatever is currently loaded rather than reporting that nothing is configured.

### `POST /api/settings/test/tvdb`

**Test a TVDB API key, without saving it.**

| Status                     | Cause                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | The key works                                                                                   |
| `201` with `status: "NOK"` | `Invalid API key`, `No TVDB API key configured`, `Unexpected response`, or a connection failure |
| `400`                      | The field is missing or not a string                                                            |

An empty key re-tests the already stored key, and only reports that nothing is configured when nothing is stored either.

### `POST /api/settings/metadata/refresh/{provider}`

**Flush one provider's cache and re-queue a metadata refresh for every affected item.**

| Parameter  | Type | Required | Description                  |
| ---------- | ---- | -------- | ---------------------------- |
| `provider` | path | Yes      | `tmdb`, `tvdb` or `sportarr` |

No request body is read.

| Status                     | Cause                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | `<PROVIDER> metadata refresh started`, or `<PROVIDER> metadata refresh is already in progress` |
| `201` with `status: "NOK"` | The provider's connection test failed, or something threw                                      |
| `400`                      | The provider is not one of the three                                                           |

The connection is tested first using whatever is **already configured**, not anything from the request. TVDB reports `No TVDB API key configured` and does nothing when no key is stored.

The refresh itself is fire and forget. Only its start is reported, and per-item failures are logged rather than returned.

:::caution "Started" does not always mean started
One lock is shared across all three providers, so a request during another provider's run answers `code: 1` with the **already in progress** message. Only the message text tells you which happened.

If no media server is configured the sweep returns immediately and silently, even though the response already said it started.
:::

## Download client

### `GET /api/settings/download-client`

**Return the stored download client connection and cleanup options.**

| Status                     | Cause                                            |
| -------------------------- | ------------------------------------------------ |
| `200`                      | The settings, **with the password in cleartext** |
| `200` with `status: "NOK"` | The read failed                                  |

An unconfigured client reads as empty strings with `download_client_delete_data` true and `download_client_fallback_ratio` `0.5`, which is indistinguishable from a deliberately blank configuration.

### `POST /api/settings/download-client`

**Store the download client connection and cleanup options.**

Request body:

```json
{
  "download_client_url": "http://qbittorrent:8080",
  "download_client_username": "user",
  "download_client_password": "...",
  "download_client_delete_data": true,
  "download_client_fallback_ratio": 0.5
}
```

`download_client_delete_data` and `download_client_fallback_ratio` are **required**, so a partial update is not possible. To change only the URL you must send the other fields too.

| Status                     | Cause                                            |
| -------------------------- | ------------------------------------------------ |
| `201`                      | Saved                                            |
| `201` with `status: "NOK"` | The write failed                                 |
| `400`                      | Validation failed, including a ratio below `0.5` |

The username and password are deliberately **not** trimmed, so a credential with real leading or trailing whitespace survives. An empty username and password are a valid configuration, since qBittorrent can bypass authentication for whitelisted subnets.

The connection is stored unverified.

:::caution download_client_delete_data has real destructive reach
With it on, removing a download also **deletes its data on disk** during cleanup, though data shared with another download is kept. This takes effect the moment you save, changing what the file-deleting `*arr` actions do.
:::

### `DELETE /api/settings/download-client`

**Clear the download client configuration and reset its cleanup options.**

| Status                     | Cause            |
| -------------------------- | ---------------- |
| `200`                      | Cleared          |
| `200` with `status: "NOK"` | The write failed |

:::warning Destructive, and it resets more than the connection
Clears the URL, username and password, with no copy kept, **and resets `download_client_delete_data` to true and `download_client_fallback_ratio` to 0.5**.

That reset is the non-obvious part: if you had turned data deletion off, removing and re-adding the client silently gives you the on-by-default behaviour back.

No torrents are touched. Afterwards the file-deleting `*arr` actions stop attempting download cleanup entirely.
:::

### `POST /api/settings/test/download-client`

**Probe a download client URL and credentials, without saving.**

| Status                     | Cause                                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `201` with `status: "OK"`  | Connected. `message` is the qBittorrent version                                                                                                                                                            |
| `201` with `status: "NOK"` | `Invalid username or password`, a message about the Web UI IP whitelist on a `403`, `Unexpected response from the download client. Verify the URL points to a qBittorrent WebUI.`, or a connection failure |
| `400`                      | Validation failed                                                                                                                                                                                          |

:::caution The body is the whole settings schema
`download_client_delete_data` and `download_client_fallback_ratio` are required even for a pure connection test. Omitting them is a `400`.
:::

This logs in to the instance you name, which creates a session there.

## Telemetry

### `GET /api/settings/telemetry/status`

**Report whether telemetry is forced off and when the next reports are due.**

Response:

```json
{
  "forcedOff": false,
  "nextSendAtWeekly": "2026-06-08T04:12:00.000Z",
  "nextSendAtRich": "2026-09-14T04:12:00.000Z"
}
```

| Status | Cause  |
| ------ | ------ |
| `200`  | Always |

Both dates are `null` whenever reporting is off, either because `TELEMETRY=off` is set in the environment or because the setting is off. They can also both be null while telemetry is on, if the scheduled job failed to register.

The weekly slot is derived per install so instances do not all report at the same minute.

### `GET /api/settings/telemetry/preview`

**Build and return the exact telemetry ping this server would send.**

| Status | Cause                  |
| ------ | ---------------------- |
| `200`  | The payload            |
| `500`  | A database read failed |

The payload carries the version, version tag, whether it is running in Docker, the Node major version, architecture, platform, and which media server type is configured. It always includes the `sample` block, deliberately, so you can review everything that could ever be sent. A real ping only carries that block one week in 32.

Nothing is transmitted by this route.

The payload contains **no identifier**: no client id, no instance id, no hostname, no URLs, no keys, and no library or media names. Counts are bucketed so exact numbers never leave, and every list is deduplicated, sorted and truncated.

This ignores the on-off state entirely and renders a preview even when telemetry is switched off.

### `POST /api/settings/telemetry`

**Turn the weekly anonymous telemetry ping on or off.**

Request body is `{ "enabled": true }`.

| Status                     | Cause                                                          |
| -------------------------- | -------------------------------------------------------------- |
| `201`                      | Saved                                                          |
| `201` with `status: "NOK"` | `TELEMETRY=off is set in the environment`, or the write failed |
| `400`                      | `enabled` is missing or not a boolean                          |

The environment variable wins at read time too, so the stored value can be on while nothing is ever sent.

There is deliberately no "send now" endpoint, because every real send counts towards the census and a test button would let one instance inflate it.
