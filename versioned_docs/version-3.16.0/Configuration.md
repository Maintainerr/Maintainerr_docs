---
id: configuration
slug: /configuration
description: Information on how to get Maintainerr up and running.
title: Configuration
---

All configuration is done inside the application. No extra config files are required.

When you first access the web UI, you should be redirected to the settings page. If that does not happen, try refreshing the page.

:::note
All Base URL settings are to be entered without the leading slash.

- Right: `tautulli`
- Wrong: `/tautulli`

:::

## General

These settings are OK for most installations.

| Setting  | Description                                                     |
| -------- | --------------------------------------------------------------- |
| Hostname | The hostname or IP address of the host running Maintainerr      |
| API key  | Maintainerr's API key. It is currently reserved for future use. |

## Media Server

You need to configure one media server: Plex, Jellyfin, or Emby. Multiple media servers are not supported simultaneously.

## Plex

Plex can be used as your media server connection.

When using a local Plex instance, make sure Plex's `Secure connections` network setting is set to `Preferred` instead of `Required`.

Maintainerr's normal Plex setup uses Plex authentication and server discovery instead of a manual host/port form.

After you authenticate with a Plex **admin** account, Maintainerr validates the token, loads the servers available to that account, and lets you choose from discovered connection candidates. This is the recommended setup because Maintainerr can use the discovered server details directly and keep automatic reconnection behavior enabled.

:::tip
Proper DNS is preferred. Plex discovery and failover can depend on resolvable Plex endpoints, and Docker users in particular may run into intermittent connection or discovery problems when container DNS is unstable. If possible, make sure your environment has working DNS resolution for Plex-related hostnames and service names.
:::

| Setting / Control | Description                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication    | Authenticate with Plex using an **admin** account. Until this succeeds, the Plex server controls stay disabled.                       |
| Server            | Shows the currently selected discovered server, or lets you choose one from the discovered server list.                               |
| Refresh icon      | Re-runs Plex server discovery for the authenticated account. Use this if the server list is stale or discovery failed the first time. |

:::tip
`Test Connection` is disabled until you are authenticated and have either selected a discovered server or enabled manual override with saved settings.
:::

<details>
<summary>Server list is empty (VPS, cloud host, or custom networking)</summary>

Maintainerr only lists Plex servers that publish a **reachable** connection to plex.tv. If authentication succeeds but the server dropdown stays empty, Plex is most likely publishing only a `local` connection that Maintainerr (running elsewhere) cannot use. This is common when Plex runs on a **VPS / cloud host** or behind unusual networking, where Plex's automatic Remote Access cannot detect a public connection.

Fix it on the Plex side by publishing a reachable address:

1. In Plex Web, open `Settings → (your server) → Network` and click **Show Advanced** (top-right) to reveal `Custom server access URLs`.
2. Into that comma-separated field, add a reachable **HTTPS** URL — e.g. your server's `*.plex.direct` address: `https://<dashed-public-ip>.<hash>.plex.direct:32400`. The `.plex.direct` host keeps a valid certificate (a reverse-proxied domain with its own cert works too). Including the port is recommended; otherwise Plex falls back to your Remote Access port. You can usually copy the correct address from Seerr if it's connected to the same Plex server.
3. Save and restart Plex. On some Docker images this setting is an environment variable instead — e.g. `PLEX_ADVERTISE_URL` on the hotio image — in which case set it there (the in-app field is managed by that variable).

Back in Maintainerr, press the **Refresh icon** next to the server selector — the server now appears in the list.

:::tip
If Maintainerr and Plex share a Docker network, you can instead skip discovery and point Maintainerr at Plex's **internal** address (e.g. `http://plex:32400`) with manual connection override below.
:::

</details>

<details>
<summary>Advanced: manual connection override</summary>

Most users should leave this closed and use the normal Plex authentication and discovery flow.

If discovery does not give you the connection you want, open `Advanced Settings` and enable `Manual connection override`. That lets you enter the hostname, port, and TLS mode directly.

Manual mode is a fallback option:

- Plex authentication is still required.
- It overrides the discovered Plex connection.
- It disables automatic reconnection for that Plex entry until you switch back.

If you want Maintainerr to connect securely in manual mode, use your `*.plex.direct` URL as the hostname and enable TLS. You can usually copy the correct address from Seerr if that service is already connected to the same Plex server.

</details>

## Jellyfin

Jellyfin can also be used as your media server connection.

| Setting      | Description                                                      |
| ------------ | ---------------------------------------------------------------- |
| Jellyfin URL | The domain name or local IP address of the host running Jellyfin |
| API key      | A Jellyfin API key generated from your Jellyfin server           |
| Admin User   | Test Connection to load the available admin users                |

## Streamystats

:::note
Streamystats is only available for Jellyfin users
:::

The separate `Settings -> Streamystats` page only appears when Jellyfin is the active media server. Maintainerr reuses your saved Jellyfin API key for authentication, so you only need to provide the Streamystats base URL.

| Setting | Description                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------- |
| URL     | The base URL of your Streamystats instance, such as `http://localhost:3000` or `https://streamystats.example.com` |

## Emby

Use your Emby server URL directly. Maintainerr supports either entering an API key manually or using `Sign in with Emby` to authenticate with an admin username and password and let Maintainerr populate the API key for you. Emby Connect is not supported because Maintainerr uses direct server authentication and does not implement Emby's cloud-based Connect flow.

| Setting    | Description                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Emby URL   | The domain name or local IP address of the host running Emby                                                                           |
| API key    | An Emby API key generated from `Dashboard -> Advanced -> API Keys`, or the token returned by `Sign in with Emby`                       |
| Admin User | Test Connection to load the available admin users, or use `Sign in with Emby` to populate the saved admin-user selection automatically |

## Seerr

Seerr configuration is required if you want to use Seerr-related rule parameters or remove Seerr requests.

| Setting | Description                                                   |
| ------- | ------------------------------------------------------------- |
| URL     | The domain name or local IP address of the host running Seerr |
| API key | The API key from Seerr settings                               |

## Radarr

Radarr's configuration is required to use its parameters in rules and to remove or unmonitor movies.

| Setting        | Description                                                    |
| -------------- | -------------------------------------------------------------- |
| Server Name    | A friendly name to help identify the server                    |
| Hostname or IP | The domain name or local IP address of the host running Radarr |
| Port           | The port Radarr runs on                                        |
| Base URL       | The URL base configured in Radarr, if one is set               |
| API key        | The API key from Radarr settings                               |

## Sonarr

Sonarr's configuration is required to use its parameters in rules and to remove or unmonitor shows.

| Setting        | Description                                                    |
| -------------- | -------------------------------------------------------------- |
| Server Name    | A friendly name to help identify the server                    |
| Hostname or IP | The domain name or local IP address of the host running Sonarr |
| Port           | The port Sonarr runs on                                        |
| Base URL       | The URL base configured in Sonarr, if one is set               |
| API key        | The API key from Sonarr settings                               |

## Exclusion tag

When Maintainerr excludes an item, it can apply a protective tag to the matching Radarr movie or Sonarr series, so the \*arr instance carries a single source of truth for "do not touch". This covers both global and collection-scoped exclusions.

:::note
The `Exclusion tag` section appears on the `Settings -> Radarr` and `Settings -> Sonarr` pages once that service is configured. Radarr and Sonarr are configured independently — each has its own enable toggle, label, and removal policy.
:::

| Setting                  | Description                                                                                                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tag excluded content     | Apply the tag below to the matching movie/series whenever an item is excluded. Off by default.                                                                                                                                           |
| Tag label                | The tag to apply, created on the \*arr instance if missing (default `dnd`). Lowercase letters, numbers, and hyphens only (`a-z`, `0-9`, `-`), with no leading, trailing, or repeated hyphens — the only characters Radarr/Sonarr accept. |
| Remove tag on un-exclude | Off by default, so a manually-set tag is never stripped. When on, Maintainerr removes only this label on un-exclude, and never while another exclusion still protects the item.                                                          |

Tagging is best-effort: the tag is added or removed through the Radarr/Sonarr editor without replacing any other tags on the item, and a failure to reach the \*arr instance is logged without blocking the exclusion itself.

## Download Client

:::note
The separate `Settings -> Download Client` page only appears once Radarr or Sonarr is configured.
:::

When media is removed through Radarr or Sonarr, Maintainerr can remove the matching completed download (and optionally its data) from your download client. Downloads are matched using the Radarr/Sonarr download history, so media removed without Radarr/Sonarr is left untouched.

qBittorrent is currently the only supported client.

### qBittorrent

:::note
Maintainerr matches downloads by the hash recorded in the Radarr/Sonarr download history, so point it at the **same qBittorrent instance Radarr/Sonarr use as their download client**, with the Web UI enabled (qBittorrent 4.1 or newer). Media grabbed through a different qBittorrent — or through a Usenet/other download client — won't be found and is left untouched.
:::

| Setting                | Description                                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL                    | The base URL of your qBittorrent WebUI, such as `http://localhost:8080` or `https://qbittorrent.example.com`                                                                                                      |
| Username               | The qBittorrent WebUI username. Leave blank if the WebUI bypasses authentication (e.g. _Bypass authentication for clients on localhost_).                                                                         |
| Password               | The qBittorrent WebUI password. Leave blank if authentication is bypassed.                                                                                                                                        |
| Delete downloaded data | When enabled, removing a download also deletes its files from disk. Turn this off if you cross-seed, so other torrents that share the data keep working.                                                          |
| Fallback seeding ratio | Whether a download has finished seeding is decided by qBittorrent's own ratio / seed-time limits. This fallback ratio only applies to downloads qBittorrent isn't limiting, and can't be below 0.5 (default 0.5). |

How it works:

- Cleanup runs only for media that Radarr or Sonarr deletes. Maintainerr looks up the download that produced the files in the Radarr/Sonarr download history and removes that download from qBittorrent. Media removed directly from the media server (without Radarr/Sonarr), manually imported items, or items whose download history has been cleared are left untouched.
- Only collection actions that delete files trigger cleanup (**Delete**, **Unmonitor and delete files**). **Unmonitor and keep files** and **Change quality profile** never remove a download.
- **Seeding is decided by qBittorrent.** A download is only removed once it has met qBittorrent's own ratio or seed-time limit; one still below its limit keeps seeding. The **Fallback seeding ratio** applies only to downloads qBittorrent enforces no limit on.
- **Separate download and library folders are handled automatically.** qBittorrent deletes its own downloaded files (in its download directory) while Radarr/Sonarr delete the imported library copy, so the common "downloads separate from the library" (hardlink/copy) setup is fully cleaned without Maintainerr needing to know any paths.
- For **Sonarr**, cleanup runs only on whole-show deletions. Season- and episode-level deletions are skipped on purpose, because a season-pack download can contain episodes you still want.
- If a download is cross-seeded (another torrent shares the same files), Maintainerr removes only the torrent entry and keeps the data so the other torrent keeps working. This follows the same general approach as [qbit_manage](https://github.com/StuffAnThings/qbit_manage), rather than trying to replace a dedicated torrent-management workflow.
- Removal is best-effort: a failure to reach the download client never blocks the Radarr/Sonarr deletion itself, so treat it as cleanup assistance rather than guaranteed download-client reconciliation. For more advanced usage; look elsewhere.
- `Test Connection` verifies the URL and credentials against the qBittorrent Web UI before saving.

:::tip Troubleshooting: "403 Forbidden" after a successful login
A `403 Forbidden` on the connection test (or in the logs) means qBittorrent accepted the credentials but its Web UI security then blocked the request — it is **not** a wrong username/password. The usual cause is that Maintainerr and qBittorrent run on different IPs (e.g. separate Docker containers). In qBittorrent go to **Options → Web UI → Security** and add Maintainerr's IP or subnet to **"Bypass authentication for clients in whitelisted IP subnets"**. A reverse proxy or host-header validation can also cause it.
:::

## Metadata

Maintainerr has a separate `Settings -> Metadata` page for poster, backdrop, and metadata-provider settings used across the UI.

This page is mainly useful when you want better artwork fallback, more reliable cross-provider ID resolution, or more control over which metadata source Maintainerr prefers.

| Setting          | Description                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TMDB API key     | Optional. If you leave this empty, Maintainerr uses its built-in shared TMDB key. Add your own key if you want an isolated quota or your own TMDB account access. |
| TVDB API key     | Optional. Enables TVDB as an additional metadata source and fallback for ID cross-references. TVDB cannot be selected as primary until it is configured.          |
| Primary          | Chooses whether Maintainerr prefers TMDB or TVDB first when resolving posters, backdrops, and related metadata lookups.                                           |
| Refresh metadata | Clears cached metadata for that provider and asks your media server to refresh matching items that already have provider IDs stored.                              |

Typical usage:

- Leave TMDB on its default setup if you just want Maintainerr to work out of the box.
- Add a TVDB key if you want another source for artwork and metadata cross-references.
- Switch the primary provider if you prefer one source's results over the other.
- Use `Refresh metadata` after changing provider settings, when testing a new provider, or when provider artwork and IDs look stale.

The metadata refresh action runs in the background. It clears Maintainerr's cached provider responses first, then asks your configured media server to refresh items that are already linked to that metadata provider.

In practice:

- changing the API key or primary provider affects future metadata lookups
- `Refresh metadata` is the manual "re-check existing linked items" action
- refresh may take longer on larger libraries because Maintainerr asks the media server to refresh existing items that already have matching provider IDs

## Tautulli

:::note
Tautulli is only available for Plex users
:::

Tautulli's configuration is required to use its parameters in rules.

| Setting | Description                                                      |
| ------- | ---------------------------------------------------------------- |
| URL     | The domain name or local IP address of the host running Tautulli |
| API key | The API key from Tautulli settings                               |
