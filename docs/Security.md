---
id: security
slug: /security
description: How to secure Maintainerr with an identity-aware reverse proxy, and what the risks are if you do not.
title: Security & Authentication
---

:::danger
Maintainerr has **no built-in authentication**. Anyone who can reach the UI or API can read your full settings — including all service API keys — and trigger destructive collection actions. Read this page before exposing Maintainerr outside your local network.
:::

## What an unauthenticated instance exposes

Every endpoint in Maintainerr's API is unauthenticated. In particular:

- `GET /api/settings` returns credentials for every configured service (Plex/Jellyfin/Emby tokens, Sonarr/Radarr API keys, Overseerr/Jellyseerr API keys, and so on).
- Collection and rule endpoints let any caller create, modify, or delete rules and trigger immediate media deletion.
- The live-log stream (`/api/logs/stream`) exposes internal application activity.

There is no masking on these responses that constitutes a protection boundary. The only safe assumption is that **the port is secret**.

## The core rule: never publish the Maintainerr port directly

Do not map the Maintainerr container port to a public interface. Instead, let only a reverse proxy that sits in front of it be reachable from outside your network, and add authentication at that proxy layer.

### Docker Compose example — no published port

```yaml
services:
  maintainerr:
    image: ghcr.io/maintainerr/maintainerr:latest
    # No `ports:` mapping — only the reverse proxy can reach this container.
    environment:
      TZ: Europe/Amsterdam
    volumes:
      - ./data:/usr/src/app/data
    networks:
      - proxy

networks:
  proxy:
    external: true
```

When there is no `ports:` entry, the container is reachable only from other containers on the same Docker network. Your reverse proxy container joins that network and forwards traffic; nothing else can.

## Recommended approach: authentik Proxy Provider

[authentik](https://goauthentik.io/) is an open-source identity provider that can place an authenticated outpost in front of any web application, including Maintainerr, without any changes to Maintainerr itself.

This approach mirrors how [authentik's own documentation](https://docs.goauthentik.io/integrations/) already covers Sonarr, Tautulli, Seerr, and Jellyfin.

### How it works

authentik's **Proxy Provider** deploys a small outpost container that intercepts every request. Unauthenticated requests are redirected to the authentik login page. Once authenticated, the outpost forwards the request to Maintainerr with no involvement from Maintainerr itself.

There are two sub-modes:

| Mode                                  | Use when                                                                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Proxy mode** (recommended)          | Maintainerr and authentik share the same domain (e.g. `maintainerr.example.com` → authentik outpost → Maintainerr container). Cookies are scoped to the subdomain.                 |
| **Forward auth — single application** | Your existing nginx/Caddy/Traefik instance calls authentik's `/outpost.goauthentik.io/auth/nginx` endpoint on every request and only proxies through when authentik returns `200`. |

### Proxy mode setup

1. In the authentik Admin Interface, go to **Applications → Providers → Create**.
2. Select **Proxy Provider**.
3. Set **External host** to the public URL of Maintainerr (e.g. `https://maintainerr.example.com`).
4. Select **Proxy mode**.
5. Create or select an **Outpost** and bind the provider to it.
6. Create an **Application** that points to the provider, and assign it to the users or groups you want to allow.

The outpost container is now the only thing that should be reachable at `maintainerr.example.com`. The Maintainerr container itself stays off the public network.

### Forward auth (single application) — nginx example

If you already run an nginx reverse proxy, you can call the authentik outpost as a forward-auth server instead of replacing nginx:

```nginx
server {
    listen 443 ssl;
    server_name maintainerr.example.com;

    # Forward-auth check
    location /outpost.goauthentik.io {
        proxy_pass              https://<authentik-outpost-url>/outpost.goauthentik.io;
        proxy_pass_request_body off;
        proxy_set_header        Content-Length "";
        proxy_set_header        X-Original-URI $request_uri;
    }

    location / {
        auth_request     /outpost.goauthentik.io/auth/nginx;
        error_page 401 = @goauthentik_proxy_signin;
        auth_request_set $auth_cookie $upstream_http_set_cookie;
        add_header       Set-Cookie $auth_cookie;

        proxy_pass http://maintainerr:6246;

        # Required for Server-Sent Events (live logs and task progress)
        proxy_buffering off;
    }

    location @goauthentik_proxy_signin {
        internal;
        add_header Set-Cookie $auth_cookie;
        return 302 /outpost.goauthentik.io/start?rd=$request_uri;
    }
}
```

:::note Server-Sent Events and `proxy_buffering`
Maintainerr streams live logs and task events over **Server-Sent Events** from `/api/logs/stream` and `/api/events/stream`. These endpoints do not send the `X-Accel-Buffering: no` header. Under nginx forward auth, the Logs page and live task progress will appear to hang unless `proxy_buffering off` is set for the location that forwards to Maintainerr. authentik's own Proxy mode outpost flushes immediately and is not affected.
:::

### What does not need an authentication exemption

Maintainerr has no inbound webhook receivers — all integrations are outbound. The UI and API share a single port. The Docker `HEALTHCHECK` runs inside the container and bypasses the proxy entirely.

The only path worth allowlisting is `/api/health/*`, and only if an **external uptime monitor** needs unauthenticated access to the health endpoint. Everything else can remain protected.

## Alternatives

The recommendation to use authentik is not a hard requirement. Any of the following also work:

| Option                       | Notes                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authelia**                 | Open-source SSO and 2FA proxy. Works as forward-auth middleware for nginx, Caddy, and Traefik.                                                              |
| **Tinyauth**                 | Lightweight single-user forward-auth server, easier to set up than Authelia or authentik when you only need one user.                                       |
| **Cloudflare Access**        | Zero-trust tunnel; no self-hosted infrastructure required. Maintainerr does not need to be reachable from the public internet at all.                       |
| **Reverse proxy basic auth** | nginx's `auth_basic` or Caddy's `basicauth` directive. Simple but credentials are sent in every request and there is no SSO. Acceptable if TLS is in place. |
| **VPN only**                 | Expose nothing publicly; access Maintainerr through WireGuard or Tailscale. The simplest option if you do not need remote access.                           |

## The API key in Settings is not a protection boundary

Maintainerr's Settings page contains an **API key** field. This key is used for **outbound requests that Maintainerr makes** (for example, when other tools call Maintainerr's API). It does not protect the UI, and it does not gate any of the endpoints listed above. Do not treat it as a substitute for network-level access control.

## Credential rotation checklist

If your Maintainerr instance has been publicly reachable without authentication:

- [ ] Rotate the API key for every connected service (Plex token, Sonarr/Radarr/Lidarr/Readarr API keys, Overseerr/Jellyseerr API key, Tautulli API key, Jellyfin/Emby API key).
- [ ] Review recent collection runs in Maintainerr's logs for unexpected deletions or rule changes.
- [ ] Check Sonarr/Radarr/Jellyseerr/Overseerr audit logs if available.
- [ ] Place Maintainerr behind authentication before bringing it back online (see above).
- [ ] Review all other services that share any of the rotated credentials.

## See also

- [Reverse Proxy](/reverseproxy) — nginx and SWAG configurations for putting Maintainerr behind a proxy.
- [API Docs](/api) — full API surface including health endpoints.
