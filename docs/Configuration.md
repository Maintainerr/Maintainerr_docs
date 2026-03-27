---
id: configuration
slug: /configuration
description: Information on how to get Maintainerr up and running.
title: Configuration
---


All configuration is done inside the application. No extra config files are required.

When you first access the web UI, you should be redirected to the settings page. If that does not happen, refresh the page.

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

Maintainerr requires at least one configured media server connection.

## Plex

Plex can be used as your media server connection.

When using a local Plex instance, make sure Plex's `Secure connections` network setting is set to `Preferred` instead of `Required`.

If you want Maintainerr to connect securely, use your `*.plex.direct` URL as the hostname and include `https://`. You can usually copy this from Seerr if that service is already connected to the same Plex server.

| Setting | Description |
| --- | --- |
| Name | A friendly name for this server |
| Hostname or IP | The domain name or local IP address of the host running Plex |
| Port | The port Plex runs on. Default: `32400` |
| Authentication | Authenticate with your Plex server using an **admin** account |

:::tip
Typical setup flow: authenticate with Plex, click the refresh icon, choose your server from the dropdown, click `Save Changes`, then click `Test Saved`.
:::

## Jellyfin

Jellyfin can also be used as your media server connection.

| Setting | Description |
| --- | --- |
| Jellyfin URL | The domain name or local IP address of the host running Jellyfin |
| API key | A Jellyfin API key generated from your Jellyfin server |
| Admin User | Test Connection to load the available admin users |

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

## Tautulli

Tautulli's configuration is required to use its parameters in rules.

| Setting | Description |
| --- | --- |
| URL| The domain name or local IP address of the host running Tautulli |
| API key | The API key from Tautulli settings |

:::note
Tautulli is only available for Plex users
:::
