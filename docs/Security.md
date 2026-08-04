---
id: security
slug: /security
description: How to put Maintainerr behind a login, and what is at risk if you do not.
title: Security & Authentication
---

:::info Who this page is for
Maintainerr has **no built-in login**, so anyone who can reach the UI or API can read your connected-service credentials and change collections. On a network you trust this is fine: running Maintainerr locally and reaching it remotely over a VPN (the most common setup) needs nothing on this page. You only need this if you want to put Maintainerr directly on the internet, or add a login in front of it for some other reason.
:::

## What is exposed if you publish it

This only matters if people you do not trust can reach Maintainerr. On a private network or over a VPN, none of the below is reachable. If you do put it on the internet without a login, though, nothing in the API checks who is calling, so:

- `GET /api/settings/database/download` downloads the whole database, with nothing hidden. This is the big one: it holds every credential and setting you have saved.
- `GET /api/settings/radarr`, `/api/settings/sonarr`, and the other per-service endpoints hand back the saved settings, including API keys.
- Anyone can create, change, or delete rules, and start deleting media right away.
- The live-log stream (`/api/logs/stream`) shows what the app is doing inside.

So if you expose it, treat the port as a secret and put a login in front.

## If you expose it, do not publish the port directly

Do not map Maintainerr's container port to a public address. Instead, put a reverse proxy in front of it, make only the proxy reachable from outside your network, and add the login at the proxy.

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

With no `ports:` entry, only other containers on the same Docker network can reach it. Your reverse proxy joins that network and passes traffic through; nothing else can get in.

If you need to reach it locally while troubleshooting, without opening the port to the world, bind it to loopback only:

```yaml
ports:
  - "127.0.0.1:6246:6246"
```

## Recommended approach: authentik Proxy Provider

[authentik](https://goauthentik.io/) is a free identity provider. It puts a login in front of any web app, including Maintainerr, without changing Maintainerr at all.

This is the same approach authentik's [own documentation](https://integrations.goauthentik.io/) already uses for Sonarr, Tautulli, Seerr, and Jellyfin.

### How it works

authentik's **Proxy Provider** runs a small outpost container that catches every request. If you are not logged in, it sends you to the authentik login page. Once you are, it passes the request on to Maintainerr, which never has to deal with any of it.

There are two sub-modes:

| Mode                                  | Use when                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Proxy mode**                        | You want the authentik outpost to act as the reverse proxy itself, replacing nginx/Caddy/Traefik for this application.                            |
| **Forward auth - single application** | You already run an nginx/Caddy/Traefik instance and want it to call authentik for auth on every request, while continuing to handle the proxying. |

### Proxy mode setup

1. In the authentik Admin Interface, go to **Applications -> Providers -> Create**.
2. Select **Proxy Provider**.
3. Set **External host** to the public URL of Maintainerr (e.g. `https://maintainerr.example.com`).
4. Set **Internal host** to the Maintainerr container's URL (e.g. `http://maintainerr:6246`). This is where the outpost sends requests once you are logged in.
5. Select **Proxy mode**.
6. Create or select an **Outpost** and bind the provider to it.
7. Create an **Application** that points to the provider, and assign it to the users or groups you want to allow.

Now the outpost is the only thing reachable at `maintainerr.example.com`. Maintainerr itself stays off the public network.

### Forward auth (single application) - nginx example

If you already run nginx, you can have it check the authentik outpost on each request instead of replacing nginx:

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
Maintainerr sends live logs and task updates as **Server-Sent Events** from `/api/logs/stream` and `/api/events/stream`, and it does not set the `X-Accel-Buffering: no` header. Under nginx forward auth, the Logs page and live task progress look frozen unless you set `proxy_buffering off` on the location that forwards to Maintainerr. authentik's own Proxy mode outpost sends data through right away, so it is not affected.
:::

### Forward auth (single application) - Traefik example

With Traefik, add a `forwardAuth` middleware that checks the authentik outpost, then attach it to the Maintainerr router. This uses Traefik's file provider:

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

Then attach that middleware to Maintainerr, and add a router so the outpost's own paths are served on the same hostname. With Docker labels on the two containers:

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

Unlike nginx, Traefik passes responses straight through and does not buffer them by default, so Server-Sent Events just work - there is no `proxy_buffering` setting to change, and no header buffers to tune.

### What you do not need to leave open

Maintainerr does not receive any webhooks - it only makes outgoing calls. The UI and API share one port. The Docker `HEALTHCHECK` runs inside the container, so it never goes through the proxy.

The only path worth leaving open is `/api/health/*`, and only if an **outside uptime monitor** needs to reach the health check without logging in. Keep it tight: in authentik's proxy mode, an open path skips the outpost completely and gets no session headers. Opening anything more than the health check is not needed and only gives an attacker more to work with.

## Alternatives

authentik is a recommendation, not a requirement. Any of these also work, and for many people the VPN option at the bottom is all they need:

| Option                       | Notes                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authelia**                 | Open-source SSO and 2FA proxy. Works as forward-auth middleware for nginx, Caddy, and Traefik.                                                                                                                                                                                                  |
| **Tinyauth**                 | Lightweight single-user forward-auth server, easier to set up than Authelia or authentik when you only need one user.                                                                                                                                                                           |
| **Cloudflare Access**        | Zero-trust tunnel; no self-hosted infrastructure required. Maintainerr does not need to be reachable from the public internet at all.                                                                                                                                                           |
| **Reverse proxy basic auth** | nginx's `auth_basic` or Caddy's `basicauth` directive. Simple but credentials are sent in every request and there is no SSO. Acceptable if TLS is in place.                                                                                                                                     |
| **VPN only**                 | Publish nothing at all, and reach Maintainerr remotely over WireGuard or Tailscale as if you were on its local network. The simplest option when you want remote access without exposing anything. (If you only ever use Maintainerr on your own LAN, you do not need a VPN or a proxy at all.) |

## The API key in Settings does not protect anything

The Settings page has an **API key** field with a regenerate button. Maintainerr creates this key on first start and uses it only for internal calls between its own services. It is never checked on requests coming from outside the container, so do not rely on it in place of real network access control.

## Credential rotation checklist

Only needed if your Maintainerr was reachable from the internet without a login. If it has only ever been local or behind a VPN, you can skip this.

- [ ] Rotate the API key for every connected service: Plex token, Sonarr/Radarr/Sportarr API keys, Seerr API key, Tautulli API key, Tracearr API key, Jellyfin/Emby API key, TMDB API key, TVDB API key, and the qBittorrent download-client password. (Streamystats needs nothing separate - Maintainerr authenticates to it with the Jellyfin API key already listed here.)
- [ ] Rotate any webhook URLs or SMTP credentials configured in Maintainerr's notification agents.
- [ ] Review recent collection runs in Maintainerr's logs for unexpected deletions or rule changes.
- [ ] Check Sonarr/Radarr/Seerr audit logs if available.
- [ ] Place Maintainerr behind authentication before bringing it back online (see above).
- [ ] Review all other services that share any of the rotated credentials.

## See also

- [Reverse Proxy](/reverseproxy) - nginx and SWAG configurations for putting Maintainerr behind a proxy.
- [API Docs](/api) - full API surface including health endpoints.
