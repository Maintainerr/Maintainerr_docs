---
id: introduction
slug: /
description: Basic information about Maintainerr
title: Introduction
author: [ydkmlt84]
hide_table_of_contents: true
hide_title: true
---

<div className="intro-landing">
  <div className="intro-hero-panel">
    <div className="intro-tagline-block">
      <h2 className="intro-tagline">
        The Perfect Media Janitor
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true">
          <path d="M160-391h45l23-66h104l24 66h44l-97-258h-46l-97 258Zm81-103 38-107h2l38 107h-78Zm319-80v-48q33-14 67.5-21t72.5-7q26 0 51 4t49 10v44q-24-9-48.5-13.5T700-610q-38 0-73 9.5T560-574Zm0 220v-49q33-13.5 67.5-20.25T700-430q26 0 51 4t49 10v44q-24-9-48.5-13.5T700-390q-38 0-73 9t-67 27Zm0-110v-48q33-14 67.5-21t72.5-7q26 0 51 4t49 10v44q-24-9-48.5-13.5T700-500q-38 0-73 9.5T560-464ZM248-300q53.57 0 104.28 12.5Q403-275 452-250v-427q-45-30-97.62-46.5Q301.76-740 248-740q-38 0-74.5 9.5T100-707v434q31-14 70.5-20.5T248-300Zm264 50q50-25 98-37.5T712-300q38 0 78.5 6t69.5 16v-429q-34-17-71.82-25-37.82-8-76.18-8-54 0-104.5 16.5T512-677v427Zm-30 90q-51-38-111-58.5T248-239q-36.54 0-71.77 9T106-208q-23.1 11-44.55-3Q40-225 40-251v-463q0-15 7-27.5T68-761q42-20 87.39-29.5 45.4-9.5 92.61-9.5 63 0 122.5 17T482-731q51-35 109.5-52T712-800q46.87 0 91.93 9.5Q849-781 891-761q14 7 21.5 19.5T920-714v463q0 27.89-22.5 42.45Q875-194 853-208q-34-14-69.23-22.5Q748.54-239 712-239q-63 0-121 21t-109 58ZM276-495Z" />
        </svg>
      </h2>
      <p className="intro-tagline-subtitle">
        Documentation for the wildly popular Maintainerr project.
      </p>
      <div className="intro-cta-row">
        <a className="button button--primary" href="/installation">Get Started</a>
        <a className="button button--secondary" href="/blog">View The Walkthroughs</a>
      </div>
    </div>
  </div>

  <div className="intro-quickstart">
    <h3>Docker Run - Quick Start</h3>

```bash
docker run -d \
  --name maintainerr \
  -e TZ=Europe/Brussels \
  -v ./data:/opt/data \
  -u 1000:1000 \
  -p 6246:6246 \
  --restart unless-stopped \
  ghcr.io/maintainerr/maintainerr:latest
```

  </div>
</div>

## Features

- Make collections on your media server from a specific set of rules, defined by you.
- Configure those rules to match your needs. (i.e. `Last viewed 30 days ago`)
- See an overview of your media server library contents.
- Manually add an item to one of the above mentioned collections.
- Manually exclude an item from one of the collections, even if it meets the rule criteria.
- Show your new collection on the *Home* screen.
- Set a number of days the collection will exist before it is deleted.
- Set Radarr and Sonarr to either **remove** or **unmonitor** media in the collection.
- Auto clear requests from Seerr
- Remove media from disk
- Switch between Plex and Jellyfin with automatic rule migration

Maintainerr supports rules across these apps :

- Plex or Jellyfin (choose one)
- Seerr
- Radarr
- Sonarr
- Tautulli
