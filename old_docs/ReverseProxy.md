---
description: Working configurations that should get you started.
title: Reverse Proxy
---

We have tried to outline some working configurations. At the very least, these should get you started in the right direction.

## NGINX

=== "Swag"

    The LinuxServer.io [SWAG](https://docs.linuxserver.io/general/swag/) project comes built in with many pre-configured reverse proxy options [^1]. One of them is for Maintainerr, and the file is named `maintainerr.subdomain.conf.sample`. You simply need to ensure that your container is named Maintainerr and that you have a DNS CNAME set for the Maintainerr subdomain you are going to use. [Need More Information?](https://github.com/linuxserver/reverse-proxy-confs/blob/master/README.md)

    If your container is not named Maintainerr, but you still want to use their pre-configured config file, you will need to change this line, `set $upstream_app maintainerr;`.

    If you don't want your address to be `maintainerr.example.com`, you will need to change this line, `server_name maintainerr.*;`.

=== "Subdomain"

    ```{nginx}
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
        }
    }
    ```
    [^1]: Ensure that your SWAG version is up to date, as the older versions have pre-2.0 Maintainerr setup.
    