---
id: migration
description: Rule migration for imports, schema upgrades, and exclusion scoping
title: Migration
---

:::tip
Backup `/opt/data/maintainerr.db` before major changes.
:::

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

The database schema includes support for overlays.

- overlay template, overlay settings, and overlay item state tables
- collection fields for `overlayEnabled`, `overlayTemplateId`, and `mediaServerSort`
- a `streamystats_url` setting for the Jellyfin-only Streamystats integration
- download-client settings for the qBittorrent cleanup integration: URL, optional username/password, whether download data should be deleted, and the fallback seeding ratio
- a `collection_media.ruleEvaluationFailed` state so upgrades can preserve which rule-managed items should be skipped by automatic handling after a rule-evaluation failure; manual collection entries are still handled normally
- a `NormalizeRuleSectionOperators` migration that backfills legacy null operators without changing existing matches: the first rule of a group stays unset, the first rule of a later section becomes `AND`, and later rules in that section become `OR`. This migration is behavior-preserving and its `down()` is a no-op.
- a `tagInArr` collection field plus six Radarr/Sonarr exclusion-tag settings (`radarr_tag_exclusions`, `radarr_exclusion_tag`, `radarr_untag_on_unexclude`, and the Sonarr equivalents) for the \*arr tagging integration. Existing collections default to untagged and exclusion tagging defaults to off, so the upgrade is behavior-preserving.
- a `sportarr_settings` table plus optional Sportarr server and quality-profile fields on collections. Existing collections remain unchanged until you configure Sportarr.
- a `cleanupLeftoverFolders` collection field for the opt-in leftover-folder cleanup. Existing collections default to disabled.
- three Tracearr settings (`tracearr_url`, `tracearr_api_key`, `tracearr_server_id`) for the Tracearr watch history integration. Existing configurations are unaffected.

No manual database work should be required, but you should still keep a backup of `/opt/data/maintainerr.db` before upgrading and allow startup migrations to complete before using the overlay screens.

## Exclusion scoping

Exclusion scoping changed in version 3.13. See [Collections - Excluding](./Collections.md#excluding) for current behavior and management.

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
