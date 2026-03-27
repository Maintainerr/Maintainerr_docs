---
id: introduction
slug: /
description: Basic information about Maintainerr
title: Introduction
author: [ydkmlt84]
---


<p align="center" className="intro-badges">
  <a href="https://discord.maintainerr.info"><img alt="Discord" src="https://img.shields.io/discord/1152219249549512724?style=flat&logo=discord&logoColor=white&label=Maintainerr" /></a>
  <picture><img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/maintainerr/maintainerr/.github%2Fworkflows%2Fbuild_dev.yml?branch=development&style=flat&logo=github&label=Latest%20Build" /></picture>
  <a href="https://github.com/maintainerr/Maintainerr/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/maintainerr/maintainerr?style=flat&logo=github&logoColor=white&label=Latest%20Release" /></a>
  <picture><img alt="GitHub commits since latest release" src="https://img.shields.io/github/commits-since/maintainerr/maintainerr/latest?style=flat&logo=github&logoColor=white" /></picture>
  <picture><img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/maintainerr/maintainerr?style=flat&logo=github&logoColor=white&label=Stars" /></picture>
  <a href="https://hub.docker.com/r/maintainerr/maintainerr"><img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/maintainerr/maintainerr?style=flat&logo=docker&logoColor=white&label=Docker%20Pulls" /></a>
  <picture><img alt="GitHub commit activity" src="https://img.shields.io/github/commit-activity/m/maintainerr/maintainerr?style=flat&logo=github&logoColor=white&label=COMMITS" /></picture>
  <picture><img alt="GitHub Issues or Pull Requests" src="https://img.shields.io/github/issues-closed/maintainerr/maintainerr?style=flat&logo=github&logoColor=white" /></picture>
  <picture><img alt="GitHub Issues or Pull Requests" src="https://img.shields.io/github/issues/maintainerr/maintainerr?style=flat&logo=github&logoColor=white" /></picture>
  <a href="https://opencollective.com/maintainerr"><img alt="Static Badge" src="https://img.shields.io/badge/DONATE-opencollective-red?style=flat&logo=opencollective&logoColor=white" /></a>
  <picture><img alt="Documentation" src="https://img.shields.io/badge/Docusaurus-%3A)-blue?style=flat&logo=docusaurus&logoColor=white" /></picture>
  <picture><img alt="GitHub License" src="https://img.shields.io/github/license/maintainerr/maintainerr?style=flat" /></picture>
</p>

**Maintainerr** makes managing your media easy. No longer do you have to worry about your precious hard drive space being taken up by Movies and TVShows, that aren't even being watched.

:::note Beta
Maintainerr is beta software, please report any bugs or issues.
:::

## Features

- Make Plex collections from a specific set of rules, defined by you.
- Configure those rules to match your needs. (i.e. `Plex last viewed 30 days ago`)
- See an overview of your Plex library contents.
- Manually add an item to one of the above mentioned collections.
- Manually exclude an item from one of the collections, even if it meets the rule criteria.
- Show your new collection on the *Plex Home* screen.
- Set a number of days the collection will exist before it is deleted.
- Set Radarr and Sonarr to either **remove** or **unmonitor** media in the collection.
- Auto clear requests from Overseerr/Jellyseerr
- Remove media from disk

Maintainerr supports rules across these apps :

- Plex
- Overseerr
- Jellyseerr
- Radarr
- Sonarr
- Tautulli

## Docker Run Quick Start

```bash
docker run -d \
  --name maintainerr \
  -e TZ=Europe/Brussels \
  -v ./data:/opt/data \
  -u 1000:1000 \
  -p 6246:6246 \
  --restart unless-stopped \
  ghcr.io/maintainerr/maintainerr:2
```
