---
id: security
slug: /security
description: How to put Maintainerr behind a login, and what is at risk if you do not.
title: Security & Authentication
---

:::info Who this page is for
Maintainerr has **no built-in login**, so anyone who can reach the UI or API can read your connected-service credentials and change collections. On a network you trust this is fine: running Maintainerr locally and reaching it remotely over a VPN (the most common setup) needs nothing on this page. You only need this if you want to put Maintainerr directly on the internet, or add a login in front of it for some other reason.
:::

## Design and threat model

Maintainerr's security model is deliberate: it is built to run as an appliance on a network you control, and it assumes that anyone who can reach it is a trusted administrator. That is a design choice, not an oversight. In practice it means Maintainerr does not, on its own:

- authenticate requests (there is no login, and the API key in Settings is only for internal calls - see below),
- rate-limit or throttle requests, or
- encrypt its stored data at rest.

Security is expected at the boundary you already control - your LAN, a VPN, or an authenticating reverse proxy - which is what the rest of this page is about. Keep Maintainerr on a trusted network or reach it over a VPN and that boundary is already there; expose it more widely and you add the boundary yourself with a reverse proxy.

## How Maintainerr handles your data

Maintainerr is built to keep your data on your own hardware and to be careful with it internally:

- **Your data stays on your hardware.** All configuration and state lives in a single SQLite database in your data directory (`/opt/data`). There is no cloud component holding any of it. Outbound traffic goes to the services you configure (your media server, the \*arrs, Seerr, and so on), to the metadata providers (TMDB/TVDB) used to match your library, and to `telemetry.maintainerr.info` for the weekly usage report below.
- **The weekly usage report is on unless you turn it off.** Once a week Maintainerr reports how it is running: its version, the platform it runs on, and which media server type is configured. Some weeks it also reports which rule properties, integrations, features, and notification agents are in use, with counts given as ranges rather than exact numbers. The report carries no identifier of any kind and nothing from your library: no account, hostname, URL, API key, library name, or media title, and no IP address is read or stored. New installs are not asked, the report is on from the start. If you are upgrading from a version without the report, Maintainerr asks you in the web interface once your media server is set up. `Keep it on` saves the answer and the prompt does not return. `Turn it off in settings` only opens the settings page, and until you save the toggle there the prompt appears again on the next visit. Either way you can change it at any time under **Settings > About > Help us improve it**. Setting the `TELEMETRY` environment variable to `off` disables it whatever that setting says. The [telemetry collector](https://github.com/Maintainerr/telemetry-collector) is a public repository, and its README lists every field the report can contain.
- **Outbound connections use verified TLS.** Calls to your services and to metadata providers use HTTPS with normal certificate verification, which the app never disables on its own. Notification email can use TLS and can optionally be PGP-encrypted.
- **Secrets are kept out of the logs.** Every log line passes through a sanitizer that masks API keys, tokens, `Authorization` headers, and credential-bearing URLs, so secrets do not leak into log files or error dumps.
- **The rules engine cannot run code or shell out.** Rules are evaluated by a typed comparator, never `eval`-ed. Database access is fully parameterized, so there is no SQL-injection surface, and the server runs no shell commands. Settings you submit are schema-validated before they are saved.
- **Cross-origin access is locked down.** In production the API sends no CORS headers by default, so another website cannot read it from your browser. If you serve a separate front end from a different origin, allow it explicitly with `CORS_ALLOWED_ORIGINS`.
- **Destructive actions are deliberately conservative.** Deletes are tied to explicit collection and rule actions, and the folder-cleanup path is fail-closed: it refuses unexpected paths, rejects symlinks and `..` traversal, canonicalizes with `realpath`, and only removes a folder once it has proven the folder is empty and safely inside the intended directory.
- **The container is hardened.** The official image runs as a non-root user with least-privilege file permissions, is built in multiple stages from a digest-pinned base, and pins security-sensitive dependencies.

**One important caveat:** the credentials you enter (Plex token, \*arr and Seerr keys, qBittorrent and SMTP passwords, notifier tokens) are stored **unencrypted** in that SQLite database - Maintainerr does not encrypt data at rest. So the database file, and any backup of it, is as sensitive as the credentials it holds: keep the data directory private, restrict its permissions, and encrypt your backups. And because Maintainerr has no login of its own, none of this replaces putting it behind an authenticating reverse proxy when you expose it (the rest of this page).

## What is exposed if you publish it

If you do put it on the internet without a login, nothing in the API checks who is calling, so:

- `GET /api/settings/database/download` downloads the whole database, with nothing hidden. This is the big one: it holds every credential and setting you have saved.
- `GET /api/settings/radarr`, `/api/settings/sonarr`, and the other per-service endpoints hand back the saved settings, including API keys.
- Anyone can create, change, or delete rules, and start deleting media right away.
- The live-log stream (`/api/logs/stream`) shows what the app is doing inside.

## If you expose it, do not publish the port directly

Do not map Maintainerr's container port to a public address. Instead, put a reverse proxy in front of it, make only the proxy reachable from outside your network, and add the login at the proxy.

Every configuration lives on one page: **[Reverse Proxy](./ReverseProxy.md)** covers nginx, Caddy, Traefik, and authentik, with and without a login. The rest of this page is about which of them to pick and why.

## Recommended approach: authentik Proxy Provider

[authentik](https://goauthentik.io/) is a free identity provider. It puts a login in front of any web app, including Maintainerr, without changing Maintainerr at all, and and authentik maintains [their own documentation page for Maintainerr](https://integrations.goauthentik.io/media/maintainerr/).

Its **Proxy Provider** runs a small outpost container that catches every request. If you are not logged in, it sends you to the authentik login page. Once you are, it passes the request on to Maintainerr, which never has to deal with any of it. It runs in either of two sub-modes:

| Mode                                  | Use when                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Proxy mode**                        | You want the authentik outpost to act as the reverse proxy itself, replacing nginx/Caddy/Traefik for this application.                            |
| **Forward auth - single application** | You already run an nginx/Caddy/Traefik instance and want it to call authentik for auth on every request, while continuing to handle the proxying. |

See [authentik Proxy Provider](./ReverseProxy.md#authentik-proxy-provider) for the setup steps and the matching proxy config.

## Alternatives

authentik is a recommendation, not a requirement. Any of these also work, and for many people the VPN option at the bottom is all they need:

| Option                       | Notes                                                                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authelia**                 | Open-source SSO and 2FA proxy. Works as forward-auth middleware for nginx, Caddy, and Traefik.                                                                                                                                                 |
| **Tinyauth**                 | Lightweight forward-auth server with a login page and 2FA, easier to set up than Authelia or authentik. See [Caddy + Tinyauth](./ReverseProxy.md#caddy-tinyauth).                                                                              |
| **Cloudflare Access**        | Zero-trust tunnel; no self-hosted infrastructure required. Maintainerr does not need to be reachable from the public internet at all.                                                                                                          |
| **Reverse proxy basic auth** | nginx's `auth_basic` or Caddy's `basic_auth` directive. Simple but credentials are sent in every request and there is no SSO. Acceptable if TLS is in place. See [Choosing how to add a login](./ReverseProxy.md#choosing-how-to-add-a-login). |
| **VPN only**                 | Publish nothing at all, and reach Maintainerr remotely over WireGuard or Tailscale as if you were on its local network. The simplest option when you want remote access without exposing anything.                                             |

## What you do not need to leave open

Maintainerr does not receive any webhooks - it only makes outgoing calls. The UI and API share one port. The Docker `HEALTHCHECK` runs inside the container, so it never goes through the proxy.

The only path worth leaving open is `/api/health/*`, and only if an **outside uptime monitor** needs to reach the health check without logging in. Keep it tight: in authentik's proxy mode, an open path skips the outpost completely and gets no session headers. Opening anything more than the health check is not needed and only gives an attacker more to work with.

## The API key in Settings does not protect anything

The Settings page has an **API key** field with a regenerate button. Maintainerr creates this key on first start and uses it only for internal calls between its own services. It is never checked on requests coming from outside the container, so do not rely on it in place of real network access control.

## Hardening checklist

If you want to run Maintainerr as safely as possible:

- [ ] **Do not publish the container port.** Reach it only through a [reverse proxy](./ReverseProxy.md), over a VPN, or on your LAN.
- [ ] **Put a login in front of it** if it is reachable from the internet - authentik, Authelia, Tinyauth, Cloudflare Access, or basic auth.
- [ ] **Do not allowlist `/api/settings/*` at your proxy.** In particular, `/api/settings/database/download` hands out the entire database. `/api/health/*` is the only path safe to leave open, and only if you actually need it.
- [ ] **Keep the data directory private.** It holds your credentials in cleartext, so restrict its permissions on the host and make sure only Maintainerr and you can read it.
- [ ] **Encrypt backups** of the data directory, and do not commit it or paste its contents anywhere.
- [ ] **Use least-privilege API keys** for the connected services where they support it, so a leaked key does less damage.
- [ ] **Run as a non-root user** with a persistent, well-permissioned volume (the official image already runs as UID 1000).
- [ ] **Keep it updated** - pull new images so dependency and security fixes land.

## Credential rotation checklist

Only needed if your Maintainerr was reachable from the internet without a login.

- [ ] Rotate the API key for every connected service: Plex token, Sonarr/Radarr/Sportarr API keys, Seerr API key, Tautulli API key, Tracearr API key, Jellyfin/Emby API key, TMDB API key, TVDB API key, and the qBittorrent download-client password. (Streamystats needs nothing separate - Maintainerr authenticates to it with the Jellyfin API key already listed here.)
- [ ] Rotate any webhook URLs or SMTP credentials configured in Maintainerr's notification agents.
- [ ] Review recent collection runs in Maintainerr's logs for unexpected deletions or rule changes.
- [ ] Check Sonarr/Radarr/Seerr audit logs if available.
- [ ] Place Maintainerr behind authentication before bringing it back online (see above).
- [ ] Review all other services that share any of the rotated credentials.

## See also

- [Reverse Proxy](./ReverseProxy.md) - nginx, Caddy, Traefik, and authentik configurations, with and without a login.
- [API Docs](/api) - full API surface including health endpoints.
