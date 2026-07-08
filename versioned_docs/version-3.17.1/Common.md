---
id: common
slug: /common
description: Common problems, and their solutions.
title: Common Problems
---

:::note
These suggestions will not solve every issue, but they cover the most common problems people run into. If you try the steps below and still cannot get Maintainerr working as expected, reach out on [Discord](https://discord.maintainerr.info).
:::

## Spinning Circle

**Problem:** I have installed Maintainerr, but when I open the page all I can see is a spinning circle.

This is usually a permissions problem. The container runs as user `1000` by default, and the host directory mounted to `/opt/data` often does not allow that user to read or write correctly.

:::tip Fix

- Check the logs with `docker logs -f maintainerr` and look for permission-related errors.
- Update ownership on the mounted data directory: `sudo chown -R 1000:1000 <host-directory for /opt/data>`

:::

## Webpage is stuck

**Problem:** When I open the page for the first time, I can click on things but nothing happens.

When Maintainerr loads for the first time, it is supposed to redirect you to the initial media server settings page. Sometimes that redirect does not happen, which makes the page look stuck.

:::tip Fix
Refresh the page.
:::

## TVDBid or TMDBid errors

**Problem:** My logs contain warnings about missing `TVDBid` or `TMDBid`, such as:

`[maintainerr] | 01/10/2024 14:20:52 [WARN] [SonarrGetterService] [TVDB] Failed to fetch tvdb id for 'Some TV Show'`

This is usually caused by bad or incomplete metadata on the affected item in your media server. Maintainerr relies on that metadata to match the exact same movie or show in Sonarr, Radarr, Overseerr, Jellyseerr, or Tautulli.

:::tip Fix
There is not a reliable fix yet. The issue usually originates from your media server metadata and the IDs it assigns, or fails to assign, to the item.

If your media server has a metadata refresh or rematch option for the affected item, you can try that, but it is not guaranteed to resolve the problem.
:::

## Deleting Items

**Problem:** I set `Take action after days` to `0`, but nothing is being removed.

`0` is supported, but actions are still processed by the `Collection Handler` scheduled task. That means the item will not be handled immediately when you save the rule.

:::tip Fix
If `Take action after days` is set to `0`, the action will run when one of these happens:

- You manually click `Handle Collections`
- The next `Collection Handler` task runs on its normal schedule

So `0` means "no waiting period before eligibility," not "take action instantly at save time."
:::

## Pre-made Rules

**Problem:** Is there a set of pre-made rules I can use as a starting point?

Yes. When creating a new rule, use the `Community` button to browse rules uploaded by other users. There is a voting system to help surface popular or useful entries, but community rules are not reviewed or guaranteed to work as advertised.

:::tip Location
![Community Button](/img/community_button.png)
:::

## Status of Services

**Problem:** Community Rules will not load, or the Feature Requests page is unavailable.

Some Maintainerr services are self-hosted and others are hosted externally. Downtime can happen even though we try to keep it minimal.

:::tip Check Status
You can check the current service status at [status.maintainerr.info](https://status.maintainerr.info).
:::
