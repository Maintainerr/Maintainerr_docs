---
id: media-server-switching-feature
slug: /media-server-switching
description: Switch between Plex, Jellyfin, and Emby, with optional rule migration.
title: Media Server Switching
---

Switch between Plex, Jellyfin, and Emby at any time with automatic rule migration.

## Process

1. **Preview** - See what will be cleared, kept, and migrated
2. **Confirm** - Choose whether to migrate rules or start fresh
3. **Execute** - Applied in a transaction (rollback on error)

**Cleared:**

- Collection media
- Exclusions
- Collection logs
- Collections, rule groups, and rules (if not migrating)
- Old media server credentials (Plex, Jellyfin, or Emby connection settings)
- The Jellyfin-only Streamystats URL

**Kept:**

- General settings
- Radarr/Sonarr configurations
- Seerr settings
- Tautulli configuration (unless you are switching away from Plex)
- Notification settings

## Rule Migration

When migrating during a switch:

- Compatible rules are automatically converted (application ID and property IDs rewritten)
- Incompatible rules are **deleted** from the database (logged with details)
- Rule groups where all rules were incompatible are also deleted
- Some properties are **remapped** to their closest equivalent (see [Incompatible Properties](#incompatible-properties))
- Collections are preserved (metadata kept, recreated on new server)

<details>
<summary><strong>Technical Details</strong></summary>

Migration compatibility is data-driven from `rules.constants.ts` - no hardcoded property ID lists. Each rule field is checked independently: `firstVal[0]` and `lastVal[0]` can come from different apps in the same rule. Maintainerr only rewrites media-server fields (`Application.PLEX` (0), `Application.JELLYFIN` (6), or `Application.EMBY` (7)) to the target server. Rules from Radarr, Sonarr, Tautulli, and Seerr are left unchanged.

For each source property, the migration service checks (in order):

1. **Exact match** - target has a property with the same `(id, name)` → compatible, no change needed
2. **Name match** - target has the same `name` at a different ID → property ID is rewritten
3. **migrateTo fallback** - source property declares a `migrateTo` name that exists in the target → property ID is rewritten to the fallback
4. **No match** → incompatible, the rule is deleted

After migration:

- Rule groups are set to `isActive: false` and `libraryId` is cleared
- Groups where every rule was incompatible are deleted entirely
- Collections have `mediaServerId` and `libraryId` reset, `mediaServerType` updated

</details>

!!! warning
Rule groups are **deactivated** after switching and libraries must be re-assigned before they will run. Collections won't function until libraries are set.

## Incompatible Properties

Property remapping is derived at runtime by matching each property's name between the source and target application definitions, with an explicit mapping used only when no name matches. The ID pairs below illustrate the mappings resolved by that behavior and are not a stable contract. The switch preview reports exactly which of your rules will be migrated or deleted and is authoritative where this illustrative list is not.

**Plex -> Jellyfin / Emby incompatible (rule deleted):**

- Watchlisted by (username) (ID 28)
- Is Watchlisted (ID 30)
- Amount of episodes marked as watched (ID 45)

**Plex -> Jellyfin / Emby remapped:**

- IMDb rating (31 to 44)
- Is Watched (43 to 42)
- Newest view date across collection (44 to 45)
- Smart collections -> regular collections (39 to 6)
- Smart collections incl. parents -> collections incl. parents (40 to 25)
- Smart collection names incl. parents -> collection names incl. parents (41 to 26)
- Smart collection names -> collection names (42 to 19)

**Plex -> Jellyfin / Emby compatible:**

- External ratings (IDs 32-38) - Rotten Tomatoes, TMDb, and IMDb show-level ratings migrate directly

**Jellyfin / Emby -> Plex incompatible (rule deleted):**

- Total play attempts including unfinished (ID 30) and its show-level equivalent (ID 31). Jellyfin and Emby track play attempts separately from completed views; Plex has no equivalent.
- Favorited by (username) (ID 39), its show-level equivalent (ID 40), and the incl. parents variant (ID 41). Plex has no favourites concept.

**Jellyfin / Emby -> Plex remapped:**

- IMDb rating (44 to 31)
- Is Watched (42 to 43)
- Newest view date across collection (45 to 44)

Emby behaves identically to Jellyfin in both directions because its property set is derived from Jellyfin's at runtime. Jellyfin and Emby migration is therefore a direct property-ID match with no special remapping.

<details>
<summary><strong>Technical Details</strong></summary>

1. UI calls `GET /api/settings/media-server/switch/preview/:targetServerType`
2. Server counts data and calls `previewMigration()` - shows migratable/skipped rules
3. UI displays preview and waits for confirmation
4. UI posts to `POST /api/settings/media-server/switch` with `{ targetServerType, migrateRules }`
5. Server validates the request (check not already on target, reject concurrent switches)
6. Server executes switch in transaction:
   - **Migrate rules** if requested (before clearing data)
   - **Clear data** via `clearMediaServerData()`:
     - If NOT migrating: Clear CollectionMedia → CollectionLog → Exclusion → RuleGroup (cascades to Rules) → Collection
     - If migrating: Clear CollectionMedia → CollectionLog → Exclusion, then UPDATE RuleGroup and Collection
   - Clear old server credentials and update `media_server_type`
   - Commit transaction (or rollback on error)
7. After commit, refresh in-memory settings and uninitialize old adapter

</details>
