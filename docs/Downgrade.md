---
id: downgrade
slug: /downgrade
title: Downgrade
description: How to install an older Maintainerr version using a database backup.
---


If you need to run an older Maintainerr version, you must use a database backup from before you upgraded.

:::note Notice
These instructions are a general guide. The most important part is restoring your backed up SQLite database into the mapped `/opt/data` directory on the host, outside the container.

You also need to pin the container image to the version you want to run in Docker Compose or your `docker run` command.
:::

## Before you start

- It is strongly recommended to back up your `maintainerr.sqlite` file regularly. There is a backup button in `Settings -> General`, or you can automate backups with your own script.
- Use a backup taken before the upgrade.
- Downgrading between unrelated versions is not officially supported. It may still work, but you should expect some risk.

## 1. Pick and pin the target version

Set your image to the version you want, for example:

```yaml
image: ghcr.io/maintainerr/maintainerr:2.10.0
```

or:

```yaml
image: maintainerr/maintainerr:2.10.0
```

## 2. Stop Maintainerr (if running)

Stop the running container before replacing the database file.

```bash
docker stop maintainerr
```

## 3. Restore your database backup

Your data lives in `/opt/data` inside the container (your host bind/volume target).

1. Open the host data directory that is mapped to `/opt/data`.
2. Find the current Maintainerr SQLite database file.
3. Replace it with the backed up copy from before the upgrade. Use a copy of the file and not the original.
4. Make sure file ownership/permissions are still correct for your container user (commonly `1000:1000`).

## 4. Start Maintainerr on the pinned version

### Docker Compose

```bash
docker compose pull
docker compose up -d
```

### Docker Run

```bash
docker pull ghcr.io/maintainerr/maintainerr:2.10.0
```

Then run your normal `docker run ...` command again with the same `/opt/data` volume mapping, but using the pinned older image tag.

## 5. Validate after startup

- Open the UI and verify your rules/settings are present.
- Check logs for startup or database errors.
- Run a manual rule test to confirm expected behavior.
