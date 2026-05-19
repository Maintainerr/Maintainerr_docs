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

| Setting | Description |
| --- | --- |
| Hostname | The hostname or IP address of the host running Maintainerr |
| API key | Maintainerr's API key. It is currently reserved for future use. |

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

| Setting / Control | Description |
| --- | --- |
| Authentication | Authenticate with Plex using an **admin** account. Until this succeeds, the Plex server controls stay disabled. |
| Server | Shows the currently selected discovered server, or lets you choose one from the discovered server list. |
| Refresh icon | Re-runs Plex server discovery for the authenticated account. Use this if the server list is stale or discovery failed the first time. |

:::tip
`Test Connection` is disabled until you are authenticated and have either selected a discovered server or enabled manual override with saved settings.
:::

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

| Setting | Description |
| --- | --- |
| Jellyfin URL | The domain name or local IP address of the host running Jellyfin |
| API key | A Jellyfin API key generated from your Jellyfin server |
| Admin User | Test Connection to load the available admin users |

## Streamystats

Streamystats is an optional Jellyfin-only integration.

The separate `Settings -> Streamystats` page only appears when Jellyfin is the active media server. Maintainerr reuses your saved Jellyfin API key for authentication, so you only need to provide the Streamystats base URL.

| Setting | Description |
| --- | --- |
| URL | The base URL of your Streamystats instance, such as `http://localhost:3000` or `https://streamystats.example.com` |

## Emby

Emby can also be used as your media server connection.

You can either enter the server URL and API key manually, or use `Sign in with Emby` to authenticate with an admin username and password and let Maintainerr populate the API key for you.

| Setting | Description |
| --- | --- |
| Emby URL | The domain name or local IP address of the host running Emby |
| API key | An Emby API key generated from `Dashboard -> Advanced -> API Keys`, or the token returned by `Sign in with Emby` |
| Admin User | Test Connection to load the available admin users, or use `Sign in with Emby` to populate the saved admin-user selection automatically |

## Seerr

Seerr configuration is required if you want to use Seerr-related rule parameters or remove Seerr requests.

| Setting | Description |
| --- | --- |
| URL | The domain name or local IP address of the host running Seerr |
| API key | The API key from Seerr settings |

## Radarr

Radarr's configuration is required to use its parameters in rules and to remove or unmonitor movies.

| Setting | Description |
| --- | --- |
| Server Name | A friendly name to help identify the server |
| Hostname or IP | The domain name or local IP address of the host running Radarr |
| Port | The port Radarr runs on |
| Base URL | The URL base configured in Radarr, if one is set |
| API key | The API key from Radarr settings |

## Sonarr

Sonarr's configuration is required to use its parameters in rules and to remove or unmonitor shows.

| Setting | Description |
| --- | --- |
| Server Name | A friendly name to help identify the server |
| Hostname or IP | The domain name or local IP address of the host running Sonarr |
| Port | The port Sonarr runs on |
| Base URL | The URL base configured in Sonarr, if one is set |
| API key | The API key from Sonarr settings |

## Metadata

Maintainerr has a separate `Settings -> Metadata` page for poster, backdrop, and metadata-provider settings used across the UI.

This page is mainly useful when you want better artwork fallback, more reliable cross-provider ID resolution, or more control over which metadata source Maintainerr prefers.

| Setting | Description |
| --- | --- |
| TMDB API key | Optional. If you leave this empty, Maintainerr uses its built-in shared TMDB key. Add your own key if you want an isolated quota or your own TMDB account access. |
| TVDB API key | Optional. Enables TVDB as an additional metadata source and fallback for ID cross-references. TVDB cannot be selected as primary until it is configured. |
| Primary | Chooses whether Maintainerr prefers TMDB or TVDB first when resolving posters, backdrops, and related metadata lookups. |
| Refresh metadata | Clears cached metadata for that provider and asks your media server to refresh matching items that already have provider IDs stored. |

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

| Setting | Description |
| --- | --- |
| URL| The domain name or local IP address of the host running Tautulli |
| API key | The API key from Tautulli settings |
