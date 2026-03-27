---
title: Downgrade
description: How to install an older Maintainerr version using a database backup.
---

If you need to run an older Maintainerr version, you must use a database backup from before you upgraded.

???+ note "Notice"
     These instructions are given as a rough guide. The most important part is placing your backed up SQLite file in the mapped `/opt/data` folder. This is done outside of the container, on the host environment. You also need to change the version being used in your image variable, in docker run/compose.

## Before you start

- It is highly recommended to make a habit of backing up your maintainerr.sqlite file. There is a button available in the Settings -> General page. You could also setup a custom script to periodically backup this file. 
- Use a backup taken before the upgrade.
- Downgrading from `main` (development) to stable is not supported, however it can be done. User beware.

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

Then run your normal `docker run ...` command again with the same `/opt/data` volume mapping, but with the pinned older tag.

## 5. Validate after startup

- Open the UI and verify your rules/settings are present.
- Check logs for startup or database errors.
- Run a manual rule test to confirm expected behavior.
