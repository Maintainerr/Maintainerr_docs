---
description: Install methods and information.
title: Installation
---

Docker is Maintainerr's supported method of installation.

Images for amd64 & arm64 are available under `jorenn92/maintainerr` and `ghcr.io/maintainerr/maintainerr`.
The containers data location is set as /opt/data. A Docker [volume][tooltip] is strongly encouraged to persist your configuration.

[tooltip]: https://docs.docker.com/storage/volumes/#start-a-container-with-a-volume "Click here to be taken to the Docker documentation page on volumes."

!!! info
    You have the <font color="orange"> option </font> to define a User and Group ID for running the container. Maintainerr will utilize the user:group setting as it's running user (inside the container), and any files it generates within your host data volume will be associated with this designated user and group. If not explicitly specified, the default UID:GID is set to 1000:1000.
    <font color="red">See [Run](#run) and [Compose](#compose) below for examples.</font>

!!! tip

    **Make sure your data volume is read/writeable by this UID:GID!**

    It is possible that you will need to change permissions on the host's data directory.

    `chown -R 1000:1000 /opt/data`  This is a "change owner" command that changes the owner of `/opt/data` to `1000:1000`.

Setting the host data directory largely depends on how you are installing Maintainerr. If using Docker, these are the two places where you would set the host data directory, depending on your method.

=== "Run Command"

    `-v <your host location>:/opt/data \`

=== "Compose"

    ``` markdown
    volumes:
      - type: bind
        source: <your host location>
        target: /opt/data
    ```   

## Run

``` {.bash .annotate}
    docker run -d \
    --name maintainerr \
    -e TZ=Europe/Brussels \
    -v <yourhostlocation>:/opt/data \ # (3)!
    -u 1000:1000 \
    -p 6246:6246 \ # (1)!
    --restart unless-stopped \
    ghcr.io/maintainerr/maintainerr:latest # (2)!
```

1. This is defined as `host:container`.
2. For this line, you could also use `jorenn92/maintainerr` instead, to use the DockerHub image.
3. In Docker containers, you are able to bind a host directory to a directory inside the container. This allows for persistent data when a container is restarted or reset.

??? note "Development Versions"
    Whilst the development version contains all of the latest features and bug fixes, there is a chance things will break. By using a development version you must be willing to report any issues you come across to the development team and provide them as much information as possible to help us resolve the issue.

    Changing from a development version to a stable version is not supported.

    - `ghcr.io/maintainerr/maintainerr:main` for the develop branch
    - `jorenn92/maintainerr:main` for the Docker Hub development image.

### Updating

Stop and remove the existing container:

```bash
docker rm -f maintainerr
```

Pull the latest image:

```bash
docker pull ghcr.io/maintainerr/maintainerr:latest
```

Finally, run the container with the same parameters you originally used to create/start the container.

You may alternatively use a third-party updating mechanism, such as [Watchtower](https://github.com/containrrr/watchtower), to keep Maintainerr up-to-date automatically.

## Compose

Define the Maintainerr service in your docker-compose.yml as follows.

``` yaml {.annotate}
services:
    maintainerr:
        image: ghcr.io/maintainerr/maintainerr:latest # (1)!
        user: 1000:1000
        volumes:
          - type: bind
            source: <your host location> # (3)!
            target: /opt/data
        environment:
          - TZ=Europe/Brussels
        ports:
          - 6246:6246 # (2)!
        restart: unless-stopped
```

1. For this line, you could also use `jorenn92/maintainerr` instead, to use the DockerHub image. The `latest` tag at the end is not required, unless you want to specify which tag to use.
2. This is defined as `host:container`.
3. In Docker containers, you are able to bind a host directory to a directory inside the container. This allows for persistent data when a container is restarted or reset.

??? note "Development Versions"
    Whilst the development version contains all of the latest features and bug fixes, there is a chance things will break. By using a development version you must be willing to report any issues you come across to the development team and provide them as much information as possible to help us resolve the issue.

    Changing from a development version to a stable version is not supported.

    - `ghcr.io/maintainerr/maintainerr:main` for the develop branch
    - `jorenn92/maintainerr:main` for the Docker Hub development image.

Save your docker-compose.yml file.
Then, while in the directory where your docker-compose file exists, start all services defined in your Compose file:

```bash
docker compose up -d
```

### Updating

Pull the latest image:

```bash
docker compose pull
```

Then, restart all services defined in the Compose file:

```bash
docker compose up -d
```

## Environment Variables

A list of all available environment variables are below. No other env variables are officially supported by Maintainerr. These are added either into the compose file or your docker run command.

| Variable | Default Value | Description |
|----------|-------|----------|
| TZ | *host timezone* | Controls date formatting in logs. |
| UI_HOSTNAME | 0.0.0.0 | The listen host of the UI web server. Can be set to :: for IPv6. |
| UI_PORT | 6246 | The listen port of the UI web server. |
| API_PORT | 3001 | The listen port of the API server. |
| BASE_PATH || If reverse proxying with a subfolder you'll want to set this. Must be in the format of `/subfolder` |
