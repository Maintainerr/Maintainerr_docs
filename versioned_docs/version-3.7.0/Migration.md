---
description: Switching between Plex and Jellyfin, rule migration for YAML and Community imports
title: Migration
---

!!! tip
    Backup `/opt/data/maintainerr.db` before major changes.

## Media Server Switching

Switch between Plex and Jellyfin at any time with automatic rule migration.

### Process

1. **Preview** - See what will be cleared, kept, and migrated
2. **Confirm** - Choose whether to migrate rules or start fresh
3. **Execute** - Applied in a transaction (rollback on error)

**Cleared:**

- Collection media
- Exclusions
- Collection logs
- Collections, rule groups, and rules (if not migrating)
- Old media server credentials (Plex or Jellyfin connection settings)

**Kept:**

- General settings
- Radarr/Sonarr configurations
- Seerr settings
- Tautulli configuration
- Notification settings

### Rule Migration

When migrating during a switch:

- Compatible rules are automatically converted (application ID and property IDs rewritten)
- Incompatible rules are **deleted** from the database (logged with details)
- Rule groups where all rules were incompatible are also deleted
- Some properties are **remapped** to their closest equivalent (see [Incompatible Properties](#incompatible-properties))
- Collections are preserved (metadata kept, recreated on new server)

<details>
<summary><strong>Technical Details</strong></summary>

Migration compatibility is data-driven from `rules.constants.ts` — no hardcoded property ID lists. Each rule's `firstVal[0]` and `lastVal[0]` fields identify its source application: `Application.PLEX` (0) or `Application.JELLYFIN` (6). Rules from Radarr, Sonarr, Tautulli, and Seerr are not modified.

For each source property, the migration service checks (in order):

1. **Exact match** — target has a property with the same `(id, name)` → compatible, no change needed
2. **Name match** — target has the same `name` at a different ID → property ID is rewritten
3. **migrateTo fallback** — source property declares a `migrateTo` name that exists in the target → property ID is rewritten to the fallback
4. **No match** → incompatible, the rule is deleted

After migration:

- Rule groups are set to `isActive: false` and `libraryId` is cleared
- Groups where every rule was incompatible are deleted entirely
- Collections have `mediaServerId` and `libraryId` reset, `mediaServerType` updated

</details>

!!! warning
    Rule groups are **deactivated** after switching and libraries must be re-assigned before they will run. Collections won't function until libraries are set.

### Incompatible Properties

**Plex → Jellyfin incompatible (deleted):**

- Watchlisted by users (ID 28)
- Is Watchlisted (ID 30)
- IMDb rating (ID 31) — Jellyfin does not have a separate IMDb rating source

**Plex → Jellyfin remapped (converted automatically):**

- Smart collections → regular collections (39 → 6)
- Smart collections incl. parents → collections incl. parents (40 → 25)
- Smart collection names incl. parents → collection names incl. parents (41 → 26)
- Smart collection names → collection names (42 → 19)

**Plex → Jellyfin compatible:**

- External ratings (IDs 32-38) — Rotten Tomatoes, TMDb, and IMDb show-level ratings migrate directly

**Jellyfin → Plex incompatible (deleted):**

- Play count (ID 30) and show play count (ID 31) — Jellyfin tracks play attempts separately from completed views; Plex does not have this concept

<details>
<summary><strong>Technical Details</strong></summary>

1. UI calls `GET /settings/media-server/switch/preview/:targetServerType`
2. Server counts data and calls `previewMigration()` — shows migratable/skipped rules
3. UI displays preview and waits for confirmation
4. UI posts to `POST /settings/media-server/switch` with `{ targetServerType, migrateRules }`
5. Server executes switch in transaction:
   - Validate request (check not already on target, reject concurrent switches)
   - **Migrate rules** if requested (before clearing data)
   - **Clear data** via `clearMediaServerData()`:
     - If NOT migrating: Clear CollectionMedia → CollectionLog → Exclusion → RuleGroup (cascades to Rules) → Collection
     - If migrating: Clear CollectionMedia → CollectionLog → Exclusion, then UPDATE RuleGroup and Collection
   - Clear old server credentials and update `media_server_type`
   - Refresh in-memory settings and uninitialize old adapter
   - Commit transaction (or rollback on error)

</details>

## YAML Import Migration

When importing YAML rules, migration is automatic and transparent.

<details>
<summary><strong>Technical Details</strong></summary>

1. UI posts to `/rules/yaml/decode` with YAML content
2. Server decodes YAML to rules
3. Server automatically calls migration before returning
4. UI receives already-migrated rules

</details>

Compatible rules convert automatically, incompatible ones are dropped.

## Community Rules Migration

Same automatic migration as YAML imports.

<details>
<summary><strong>Technical Details</strong></summary>

1. UI posts to `/rules/migrate` with community rules
2. Server migrates rules based on configured server
3. UI receives migrated rules

</details>

Import any community rule regardless of origin server.

!!! note
    Community rules from much older Maintainerr versions may not work due to schema changes.
