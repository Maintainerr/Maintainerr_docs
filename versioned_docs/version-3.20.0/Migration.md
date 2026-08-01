---
id: migration
description: Switching between Plex, Jellyfin, and Emby, plus rule migration for YAML and Community imports
title: Migration
---

:::tip
Backup `/opt/data/maintainerr.db` before major changes.
:::

## Media Server Switching

Switch between Plex, Jellyfin, and Emby at any time with automatic rule migration.

### Process

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

### Rule Migration

When migrating during a switch:

- Compatible rules are automatically converted (application ID and property IDs rewritten)
- Incompatible rules are **deleted** from the database (logged with details)
- Rule groups where all rules were incompatible are also deleted
- Some properties are **remapped** to their closest equivalent (see [Incompatible Properties](#incompatible-properties))
- Collections are preserved (metadata kept, recreated on new server)

<details>
<summary><strong>Technical Details</strong></summary>

Migration compatibility is data-driven from `rules.constants.ts` — no hardcoded property ID lists. Each rule field is checked independently: `firstVal[0]` and `lastVal[0]` can come from different apps in the same rule. Maintainerr only rewrites media-server fields (`Application.PLEX` (0), `Application.JELLYFIN` (6), or `Application.EMBY` (7)) to the target server. Rules from Radarr, Sonarr, Tautulli, and Seerr are left unchanged.

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

:::warning
Rule groups are **deactivated** after switching and libraries must be re-assigned before they will run. Collections won't function until libraries are set.
:::

### Incompatible Properties

**Plex → Jellyfin / Emby incompatible (deleted):**

- Watchlisted by users (ID 28)
- Is Watchlisted (ID 30)
- IMDb rating (ID 31) — Jellyfin does not have a separate IMDb rating source

**Plex → Jellyfin / Emby remapped (converted automatically):**

- Smart collections → regular collections (39 → 6)
- Smart collections incl. parents → collections incl. parents (40 → 25)
- Smart collection names incl. parents → collection names incl. parents (41 → 26)
- Smart collection names → collection names (42 → 19)

**Plex → Jellyfin / Emby compatible:**

- External ratings (IDs 32-38) — Rotten Tomatoes, TMDb, and IMDb show-level ratings migrate directly

**Jellyfin / Emby → Plex incompatible (deleted):**

- Play count (ID 30) and show play count (ID 31) — Jellyfin tracks play attempts separately from completed views; Plex does not have this concept

**Jellyfin ↔ Emby:**

- Emby mirrors Jellyfin's rule property list, so Jellyfin ↔ Emby migration is a direct property-ID match with no special remapping.

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

Compatible rules convert automatically. Rules whose YAML identifiers cannot be resolved, or whose media-server property has no equivalent on the configured server, are skipped instead of rejecting the whole import. The UI reports how many rules were skipped.

YAML export uses the same safeguard for unresolved properties, so stale rules are skipped instead of producing invalid YAML.

## Feature schema upgrades

Recent Maintainerr releases also add database support for overlays.

- new overlay template, overlay settings, and overlay item state tables
- new collection fields for `overlayEnabled`, `overlayTemplateId`, and `mediaServerSort`
- new `streamystats_url` setting for the Jellyfin-only Streamystats integration
- new download-client settings for the qBittorrent cleanup integration: URL, optional username/password, whether download data should be deleted, and the fallback seeding ratio
- new `collection_media.ruleEvaluationFailed` state so upgrades can preserve which rule-managed items should be skipped by automatic handling after a rule-evaluation failure; manual collection entries are still handled normally
- new `NormalizeRuleSectionOperators` migration that backfills legacy null operators without changing existing matches: the first rule of a group stays unset, the first rule of a later section becomes `AND`, and later rules in that section become `OR`. This migration is behavior-preserving and its `down()` is a no-op.
- new `tagInArr` collection field plus six Radarr/Sonarr exclusion-tag settings (`radarr_tag_exclusions`, `radarr_exclusion_tag`, `radarr_untag_on_unexclude`, and the Sonarr equivalents) for the \*arr tagging integration. Existing collections default to untagged and exclusion tagging defaults to off, so the upgrade is behavior-preserving.
- a `sportarr_settings` table plus optional Sportarr server and quality-profile fields on collections. Existing collections remain unchanged until you configure Sportarr.

No manual database work should be required, but you should still keep a backup of `/opt/data/maintainerr.db` before upgrading and allow startup migrations to complete before using the new overlay screens.

## Exclusion scoping

Excluding an item inside one specific rule group used to hide it from every rule group. From version 3.13 and onwards, rule-group exclusions are scoped to the group where you set them, so the item can still appear in and be acted on by other groups unless you exclude it globally.

Example: if item `A` is excluded only in rule group `Leaving Soon`, it no longer stays hidden from another group such as `Recently Watched`. To keep it out of both, add a global exclusion instead.

Adding a global exclusion removes that item's existing scoped exclusions. If you later remove the global exclusion, those scoped exclusions do not come back automatically, so re-add them if you still want the item excluded only in selected groups.

## Community Rules Migration

Same automatic migration as YAML imports.

<details>
<summary><strong>Technical Details</strong></summary>

1. UI posts to `/rules/migrate` with community rules
2. Server migrates rules based on configured server
3. UI receives migrated rules

</details>

Import any community rule regardless of origin server. Maintainerr migrates media-server properties to your configured server the same way as YAML imports: `firstVal` and `lastVal` are handled independently, non-media-server apps are left untouched, and rules with no equivalent target-server property are skipped with a user-visible skipped count.

:::note
Community rules from much older Maintainerr versions may not work due to schema changes.
:::
