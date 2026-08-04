---
id: security
slug: /security
description: How to secure Maintainerr with an identity-aware reverse proxy, and what the risks are if you do not.
title: Security & Authentication
---

:::danger
Maintainerr has **no built-in authentication**. Anyone who can reach the UI or API can read credentials for every connected service and trigger destructive collection actions. Read this page before exposing Maintainerr outside your local network.
:::

## What an unauthenticated instance exposes

Every endpoint in Maintainerr's API is unauthenticated. The most severe examples:

- `GET /api/settings/database/download` streams the entire SQLite database file, unredacted. This is the single most dangerous endpoint: it contains all stored credentials and configuration.
- `GET /api/settings/radarr`, `/api/settings/sonarr`, and equivalent per-service endpoints return raw repository rows including API keys.
- Collection and rule endpoints let any caller create, modify, or delete rules and trigger immediate media deletion.
- The live-log stream (`/api/logs/stream`) exposes internal application activity.

The only safe assumption is that **the port is secret**.

## The core rule: never publish the Maintainerr port directly

Do not map the Maintainerr container port to a public interface. Instead, let only a reverse proxy that sits in front of it be reachable from outside your network, and add authentication at that proxy layer.

### Docker Compose example - no published port

```yaml
services:
  maintainerr:
    image: ghcr.io/maintainerr/maintainerr:latest
    # No `ports:` mapping - only the reverse proxy can reach this container.
    environment:
      TZ: Europe/Amsterdam
    volumes:
      - ./data:/opt/data
    networks:
      - proxy

networks:
  proxy:
    external: true
```

When there is no `ports:` entry, the container is reachable only from other containers on the same Docker network. Your reverse proxy container joins that network and forwards traffic; nothing else can.

If you need local access while troubleshooting without exposing the port publicly, bind only to loopback:

```yaml
ports:
  - "127.0.0.1:6246:6246"
```

## Recommended approach: authentik Proxy Provider

[authentik](https://goauthentik.io/) is an open-source identity provider that can place an authenticated outpost in front of any web application, including Maintainerr, without any changes to Maintainerr itself.

This approach mirrors how [authentik's own documentation](https://integrations.goauthentik.io/) already covers Sonarr, Tautulli, Seerr, and Jellyfin.

### How it works

authentik's **Proxy Provider** deploys a small outpost container that intercepts every request. Unauthenticated requests are redirected to the authentik login page. Once authenticated, the outpost forwards the request to Maintainerr with no involvement from Maintainerr itself.

There are two sub-modes:

| Mode                                  | Use when                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Proxy mode**                        | You want the authentik outpost to act as the reverse proxy itself, replacing nginx/Caddy/Traefik for this application.                            |
| **Forward auth - single application** | You already run an nginx/Caddy/Traefik instance and want it to call authentik for auth on every request, while continuing to handle the proxying. |

### Proxy mode setup

1. In the authentik Admin Interface, go to **Applications -> Providers -> Create**.
2. Select **Proxy Provider**.
3. Set **External host** to the public URL of Maintainerr (e.g. `https://maintainerr.example.com`).
4. Set **Internal host** to the upstream URL of the Maintainerr container (e.g. `http://maintainerr:6246`). This is the address the outpost forwards authenticated requests to.
5. Select **Proxy mode**.
6. Create or select an **Outpost** and bind the provider to it.
7. Create an **Application** that points to the provider, and assign it to the users or groups you want to allow.

The outpost container is now the only thing that should be reachable at `maintainerr.example.com`. The Maintainerr container itself stays off the public network.

### Forward auth (single application) - nginx example

If you already run an nginx reverse proxy, you can call the authentik outpost as a forward-auth server instead of replacing nginx:

```nginx
server {
    listen 443 ssl;
    server_name maintainerr.example.com;

    # Forward-auth check against the authentik outpost
    location /outpost.goauthentik.io {
        proxy_pass              https://<authentik-outpost-url>/outpost.goauthentik.io;
        proxy_pass_request_body off;
        proxy_set_header        Content-Length "";
        proxy_set_header        Host $host;
        proxy_set_header        X-Original-URL $scheme://$http_host$request_uri;
        auth_request_set        $auth_cookie $upstream_http_set_cookie;
        add_header              Set-Cookie $auth_cookie;

        # The outpost's response headers can exceed nginx's default buffer,
        # producing "upstream sent too big header". These apply to the auth
        # subrequest, so they must live here, not under `location /`.
        proxy_buffer_size 32k;
        proxy_buffers     8 16k;
    }

    location / {
        auth_request /outpost.goauthentik.io/auth/nginx;
        error_page 401 = @goauthentik_proxy_signin;
        auth_request_set $auth_cookie $upstream_http_set_cookie;
        add_header       Set-Cookie $auth_cookie;

        proxy_pass http://maintainerr:6246;

        # Required for Server-Sent Events (live logs and task progress).
        # Note: proxy_buffers is ignored while buffering is off, so the
        # buffer sizes above belong with the outpost location, not here.
        proxy_buffering off;
    }

    location @goauthentik_proxy_signin {
        internal;
        add_header Set-Cookie $auth_cookie;
        return 302 /outpost.goauthentik.io/start?rd=$scheme://$http_host$request_uri;
    }
}
```

:::note Server-Sent Events and `proxy_buffering`
Maintainerr streams live logs and task events over **Server-Sent Events** from `/api/logs/stream` and `/api/events/stream`. These endpoints do not send the `X-Accel-Buffering: no` header. Under nginx forward auth, the Logs page and live task progress will appear to hang unless `proxy_buffering off` is set for the location that forwards to Maintainerr. authentik's own Proxy mode outpost flushes immediately and is not affected.
:::

### Forward auth (single application) - Traefik example

With Traefik, define a `forwardAuth` middleware that calls the authentik outpost, then attach it to the Maintainerr router. This dynamic configuration uses Traefik's file provider:

```yaml
# traefik-dynamic.yml
http:
  middlewares:
    authentik:
      forwardAuth:
        address: http://<authentik-outpost-host>:9000/outpost.goauthentik.io/auth/traefik
        trustForwardHeader: true
        authResponseHeaders:
          - X-authentik-username
          - X-authentik-groups
          - X-authentik-email
          - X-authentik-name
          - X-authentik-uid
```

Then attach the middleware to Maintainerr and give the outpost's own paths a router on the same hostname. Using Docker labels on the two containers:

```yaml
services:
  maintainerr:
    image: ghcr.io/maintainerr/maintainerr:latest
    # Still no published port - only Traefik can reach this container.
    labels:
      traefik.enable: "true"
      traefik.http.routers.maintainerr.rule: "Host(`maintainerr.example.com`)"
      traefik.http.routers.maintainerr.entrypoints: "websecure"
      traefik.http.routers.maintainerr.tls: "true"
      traefik.http.routers.maintainerr.middlewares: "authentik@file"
      traefik.http.services.maintainerr.loadbalancer.server.port: "6246"
    networks:
      - proxy

  authentik-outpost:
    image: ghcr.io/goauthentik/proxy:latest
    # Standard authentik outpost env (AUTHENTIK_HOST, AUTHENTIK_TOKEN, ...).
    labels:
      traefik.enable: "true"
      # Route the outpost's auth and redirect paths on the same hostname.
      traefik.http.routers.authentik.rule: "Host(`maintainerr.example.com`) && PathPrefix(`/outpost.goauthentik.io/`)"
      traefik.http.routers.authentik.entrypoints: "websecure"
      traefik.http.routers.authentik.tls: "true"
      traefik.http.services.authentik.loadbalancer.server.port: "9000"
    networks:
      - proxy
```

Unlike nginx, Traefik streams upstream responses and does not buffer them by default, so Server-Sent Events work without extra configuration - there is no `proxy_buffering` equivalent to set, and no outpost header-buffer tuning is required.

### What does not need an authentication exemption

Maintainerr has no inbound webhook receivers - all integrations are outbound. The UI and API share a single port. The Docker `HEALTHCHECK` runs inside the container and bypasses the proxy entirely.

The only path worth allowlisting is `/api/health/*`, and only if an **external uptime monitor** needs unauthenticated access to the health endpoint. Be conservative: in authentik's proxy mode, allowlisted paths bypass outpost processing entirely and receive no session headers. Allowlisting anything beyond health endpoints is not necessary and widens the attack surface.

## Alternatives

The recommendation to use authentik is not a hard requirement. Any of the following also work:

| Option                       | Notes                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authelia**                 | Open-source SSO and 2FA proxy. Works as forward-auth middleware for nginx, Caddy, and Traefik.                                                                                                                                                                                                  |
| **Tinyauth**                 | Lightweight single-user forward-auth server, easier to set up than Authelia or authentik when you only need one user.                                                                                                                                                                           |
| **Cloudflare Access**        | Zero-trust tunnel; no self-hosted infrastructure required. Maintainerr does not need to be reachable from the public internet at all.                                                                                                                                                           |
| **Reverse proxy basic auth** | nginx's `auth_basic` or Caddy's `basicauth` directive. Simple but credentials are sent in every request and there is no SSO. Acceptable if TLS is in place.                                                                                                                                     |
| **VPN only**                 | Publish nothing at all, and reach Maintainerr remotely over WireGuard or Tailscale as if you were on its local network. The simplest option when you want remote access without exposing anything. (If you only ever use Maintainerr on your own LAN, you do not need a VPN or a proxy at all.) |

## The API key in Settings is not a protection boundary

Maintainerr's Settings page contains an **API key** field with a regenerate button. This key is generated at first boot and is used only for internal loopback calls between Maintainerr's own services. It is never validated on any inbound request from outside the container. Do not treat it as a substitute for network-level access control.

## Credential rotation checklist

If your Maintainerr instance has been publicly reachable without authentication:

- [ ] Rotate the API key for every connected service: Plex token, Sonarr/Radarr/Sportarr API keys, Seerr API key, Tautulli API key, Tracearr API key, Jellyfin/Emby API key, TMDB API key, TVDB API key, and the qBittorrent download-client password. (Streamystats needs nothing separate - Maintainerr authenticates to it with the Jellyfin API key already listed here.)
- [ ] Rotate any webhook URLs or SMTP credentials configured in Maintainerr's notification agents.
- [ ] Review recent collection runs in Maintainerr's logs for unexpected deletions or rule changes.
- [ ] Check Sonarr/Radarr/Seerr audit logs if available.
- [ ] Place Maintainerr behind authentication before bringing it back online (see above).
- [ ] Review all other services that share any of the rotated credentials.

## See also

- [Reverse Proxy](/reverseproxy) - nginx and SWAG configurations for putting Maintainerr behind a proxy.
- [API Docs](/api) - full API surface including health endpoints.
