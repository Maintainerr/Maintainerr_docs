---
id: reverseproxy
slug: /reverseproxy
description: Working reverse proxy configurations for nginx, Caddy, Traefik and authentik, with and without a login.
title: Reverse Proxy
---

This page collects working configurations for putting Maintainerr behind a reverse proxy. At the very least, these should get you started in the right direction.

Maintainerr has **no built-in login**, so the proxy is also where you add one. [Security & Authentication](./Security.md) explains what is at risk and which approach to pick; this page is the configuration itself.

## Before you start

### Do not publish the container port

Give the proxy a private route to Maintainerr and publish nothing else. With no `ports:` entry, only other containers on the same Docker network can reach it:

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

If your proxy runs on the host rather than in Docker, bind the port to loopback instead of to every interface:

```yaml
ports:
  - "127.0.0.1:6246:6246"
```

The examples below use `maintainerr:6246` when the proxy shares a Docker network with Maintainerr, and `127.0.0.1:6246` when it does not. Use whichever matches your setup.

### What Maintainerr needs from a proxy

- **One port.** The UI and the API share port `6246`. There are no webhooks to route in: Maintainerr only makes outgoing calls.
- **Unbuffered responses.** The Logs page and live task progress are [Server-Sent Events](#server-sent-events) from `/api/logs/stream` and `/api/events/stream`. nginx buffers these by default and needs `proxy_buffering off`; Caddy and Traefik stream them through as-is.
- **No WebSockets.** Nothing in Maintainerr needs an `Upgrade` header.
- **`BASE_PATH` for subfolders.** To serve Maintainerr from `https://example.com/maintainerr`, set the `BASE_PATH` environment variable to `/maintainerr` as well as configuring the proxy. See [Installation](./Installation.mdx).

:::danger Do not allowlist `/api/settings/*`
Whatever you put in front of Maintainerr must cover the whole application. `GET /api/settings/database/download` hands out the entire database, credentials included. `/api/health/*` is the only path worth leaving unauthenticated, and only if an outside uptime monitor needs it.
:::

### Server-Sent Events

Maintainerr streams live logs and task updates as Server-Sent Events, and it does not send the `X-Accel-Buffering: no` header that would tell nginx to stop buffering. Without `proxy_buffering off` on the location that forwards to Maintainerr, the Logs page and live task progress look frozen. Caddy and Traefik pass responses straight through and need no equivalent setting.

## Choosing how to add a login

| Approach                                                                                            | Good for                                                                                                         |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Basic auth ([nginx](#nginx-basic-auth), [Caddy](#caddy-basic-auth), [Traefik](#traefik-basic-auth)) | One or two people, no SSO, no 2FA. A few lines of proxy config and nothing else to run.                          |
| [Tinyauth](#caddy-tinyauth)                                                                         | A login page and 2FA without running a full identity provider.                                                   |
| [authentik](#authentik-proxy-provider)                                                              | SSO across several apps, groups, and full 2FA. Recommended when you already run it or plan to.                   |
| VPN only                                                                                            | Publish nothing at all and reach Maintainerr over WireGuard or Tailscale. Needs none of the config on this page. |

## NGINX

### SWAG

The LinuxServer.io [SWAG](https://docs.linuxserver.io/general/swag/) project comes built in with many pre-configured reverse proxy options [^1]. One of them is for Maintainerr, and the file is named `maintainerr.subdomain.conf.sample`. You simply need to ensure that your container is named Maintainerr and that you have a DNS CNAME set for the Maintainerr subdomain you are going to use. [Need More Information?](https://github.com/linuxserver/reverse-proxy-confs/blob/master/README.md)

If your container is not named Maintainerr, but you still want to use their pre-configured config file, you will need to change this line, `set $upstream_app maintainerr;`.

If you don't want your address to be `maintainerr.example.com`, you will need to change this line, `server_name maintainerr.*;`.

### Subdomain

```nginx
server {
    listen 80;
    server_name maintainerr.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name maintainerr.example.com;

    ssl_certificate /etc/letsencrypt/live/maintainerr.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/maintainerr.example.com/privkey.pem;

    proxy_set_header Referer $http_referer;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Real-Port $remote_port;
    proxy_set_header X-Forwarded-Host $host:$remote_port;
    proxy_set_header X-Forwarded-Server $host;
    proxy_set_header X-Forwarded-Port $remote_port;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Ssl on;

    location / {
        proxy_pass http://<maintainerr_url>:6246;

        # Required for the live logs and task progress. See Server-Sent Events above.
        proxy_buffering off;
    }
}
```

### NGINX + basic auth {#nginx-basic-auth}

Create the password file first, then add two directives to the `location` block:

```bash
htpasswd -cB /etc/nginx/.htpasswd bob
```

```nginx
location / {
    auth_basic           "Maintainerr";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # Maintainerr has no login of its own, so it has no use for these
    # credentials. Do not pass them on.
    proxy_set_header Authorization "";

    proxy_pass http://maintainerr:6246;
    proxy_buffering off;
}
```

### NGINX + authentik forward auth {#nginx-authentik}

If you already run nginx, you can have it check an authentik outpost on each request instead of replacing nginx. Set up the provider first: see [authentik forward auth](#authentik-forward-auth).

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

## Caddy

Caddy requests and renews certificates on its own, so a working subdomain is two lines:

```caddy
maintainerr.example.com {
    reverse_proxy maintainerr:6246
}
```

### Caddy + basic auth {#caddy-basic-auth}

Caddy can hold the login itself, which is the least you can run and still have a password in front of Maintainerr.

This example runs Caddy on the host, so Maintainerr is bound to loopback and nothing else can reach it:

```yaml
services:
  maintainerr:
    image: ghcr.io/maintainerr/maintainerr:latest
    container_name: maintainerr
    ports:
      - "127.0.0.1:6246:6246"
    network_mode: bridge
    restart: unless-stopped
```

If you run Caddy in a container instead, drop the `ports:` mapping, put both containers on the same Docker network, and proxy to `maintainerr:6246` - a containerised Caddy cannot reach the host's `127.0.0.1`.

Then add the login in your `Caddyfile`:

```caddy
maintainerr.example.com {
    basic_auth {
        # Username "Bob", password "hiccup" - replace both.
        # Hash it with `caddy hash-password` or `htpasswd -nB username`.
        Bob $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG
    }
    reverse_proxy 127.0.0.1:6246 {
        # Maintainerr has no login of its own, so it has no use for these
        # credentials. Do not pass them on.
        header_up -Authorization
    }
}
```

:::note Caddy version
The directive is `basic_auth` from Caddy 2.8 onwards. The old `basicauth` spelling still works but logs a deprecation warning on every start.
:::

### Caddy + Tinyauth {#caddy-tinyauth}

[Tinyauth](https://tinyauth.app/) is a small forward-auth server that adds a login page and 2FA without running a full identity provider. Caddy asks it about every request:

```caddy
maintainerr.example.com {
    forward_auth tinyauth:3000 {
        uri /api/auth/caddy
    }
    reverse_proxy maintainerr:6246
}
```

Tinyauth also needs its own hostname routed to it so it can serve the login page, and it reads the client IP from `X-Forwarded-For`, so set `TINYAUTH_AUTH_TRUSTEDPROXIES` to your Caddy instance. Those settings belong to Tinyauth rather than to Maintainerr: see [Tinyauth's Caddy guide](https://tinyauth.app/docs/community/caddy/).

### Caddy + authentik forward auth {#caddy-authentik}

Set up the provider first: see [authentik forward auth](#authentik-forward-auth).

```caddy
maintainerr.example.com {
    # Always forward the outpost path to the outpost itself.
    reverse_proxy /outpost.goauthentik.io/* http://authentik-outpost:9000

    forward_auth http://authentik-outpost:9000 {
        uri /outpost.goauthentik.io/auth/caddy

        # Capitalisation of these header names matters. Lower-case them and
        # authentik hands back empty values.
        copy_headers X-Authentik-Username X-Authentik-Groups X-Authentik-Email X-Authentik-Name X-Authentik-Uid

        # Trusts every private range. Narrow this to the outpost's own IP if you can.
        trusted_proxies private_ranges
    }

    reverse_proxy maintainerr:6246
}
```

## Traefik

With the Docker provider, Maintainerr needs labels and no published port:

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
      traefik.http.services.maintainerr.loadbalancer.server.port: "6246"
    networks:
      - proxy
```

### Traefik + basic auth {#traefik-basic-auth}

Add a `basicauth` middleware and attach it to the router:

```yaml
labels:
  traefik.http.middlewares.maintainerr-auth.basicauth.users: "Bob:$$2a$$14$$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG"
  traefik.http.middlewares.maintainerr-auth.basicauth.removeheader: "true"
  traefik.http.routers.maintainerr.middlewares: "maintainerr-auth"
```

`removeheader` strips the credentials before the request reaches Maintainerr, which has no use for them. Every `$` in the hash has to be doubled in a Compose file, which this one-liner does for you:

```bash
echo $(htpasswd -nB bob) | sed -e s/\\$/\\$\\$/g
```

### Traefik + authentik forward auth {#traefik-authentik}

Set up the provider first: see [authentik forward auth](#authentik-forward-auth). Declare the middleware through the file provider:

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

Then attach that middleware to Maintainerr, and add a router so the outpost's own paths are served on the same hostname:

```yaml
services:
  maintainerr:
    image: ghcr.io/maintainerr/maintainerr:latest
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

## authentik Proxy Provider

[authentik](https://goauthentik.io/) is a free identity provider. Its **Proxy Provider** runs a small outpost container that catches every request: if you are not logged in, it sends you to the authentik login page, and once you are, it passes the request on to Maintainerr, which never has to deal with any of it. authentik maintains [their own documentation page for Maintainerr](https://integrations.goauthentik.io/media/maintainerr/).

There are two sub-modes.

### Proxy mode

The outpost is the reverse proxy, replacing nginx, Caddy, or Traefik for this application.

1. In the authentik Admin Interface, go to **Applications -> Providers -> Create**.
2. Select **Proxy Provider**.
3. Set **External host** to the public URL of Maintainerr (e.g. `https://maintainerr.example.com`).
4. Set **Internal host** to the Maintainerr container's URL (e.g. `http://maintainerr:6246`). This is where the outpost sends requests once you are logged in.
5. Select **Proxy mode**.
6. Create or select an **Outpost** and bind the provider to it.
7. Create an **Application** that points to the provider, and assign it to the users or groups you want to allow.

With that in place, the outpost is the only thing reachable at `maintainerr.example.com`. Maintainerr itself stays off the public network. authentik's proxy-mode outpost sends data through right away, so Server-Sent Events need nothing extra.

### authentik forward auth

Keep your existing proxy and have it call the outpost on every request. Follow the steps above, but select **Forward auth (single application)** at step 5 instead of **Proxy mode**, then apply the matching proxy config: [nginx](#nginx-authentik), [Caddy](#caddy-authentik), or [Traefik](#traefik-authentik).

In proxy mode, an unauthenticated path skips the outpost completely and gets no session headers, so keep any exceptions to `/api/health/*`.

[^1]: Ensure that your SWAG version is up to date, as the older versions have pre-2.0 Maintainerr setup.
