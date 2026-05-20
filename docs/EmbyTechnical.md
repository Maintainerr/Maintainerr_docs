---
id: emby-technical-reference
slug: /technical/emby
description: Internal reference for Maintainerr's Emby adapter, verified behavior, and follow-up audit findings.
title: Emby Technical Reference
---

This page ports the upstream technical notes from Maintainerr's `docs/emby-support.md` and `docs/emby-followups.md`.

For end-user setup, use [Configuration](./Configuration.md), [Migration](./Migration.md), and [API](./API.md). This page focuses on the adapter internals, verified behavior, and the Emby-specific caveats that were documented upstream.

## Implementation overview

Maintainerr adds Emby as a third media-server adapter alongside Plex and Jellyfin.

### User-facing surface

- `Settings -> Emby` for URL, API key, and admin-user selection
- `Sign in with Emby` credentials login that can populate the saved API key
- Emby-specific rule selection through `Application.EMBY`
- Media-server switching and rule migration in both directions between Emby, Plex, and Jellyfin

### Server-side surface

- `EmbyAdapterService` implements the shared `IMediaServerService`
- `EmbyApi` owns the Emby HTTP client creation
- `EmbyGetterService` mirrors the Jellyfin getter model for Emby rule-property evaluation
- Emby-specific settings routes live under `/api/settings/emby`
- Emby support adds four nullable settings columns: `emby_url`, `emby_api_key`, `emby_user_id`, and `emby_server_name`

## Architecture and invariants

### Separate adapter and getter

The upstream implementation deliberately keeps Emby separate from Jellyfin even though the two servers share ancestry.

- No shared Jellyfin/Emby base class was introduced
- Feature-dependent behavior should continue to rely on `supportsFeature()` rather than branching in shared layers
- Emby gets its own cache namespace and invalidation path

### Rule migration model

`Application.EMBY = 7` and reuses Jellyfin's property list.

That gives Maintainerr these migration rules:

- Emby ↔ Jellyfin is a direct property-ID match
- Emby ↔ Plex uses the explicit migration/remap path
- Source detection and setup inference both treat Emby as a first-class media server

### Other important design notes

- The Emby login UX follows the same pattern as the existing Plex login flow
- The BoxSet empty-children sync-lag workaround that already existed for Jellyfin was extended to Emby too
- Trailing-slash trimming was changed from regex replacement to string operations during the Emby work to match existing codebase patterns

## Verified vs scaffolded behavior

The upstream technical document split Emby support into verified paths and scaffolded-but-unverified paths.

### Verified against a live Emby 4.9.3.0 server

- Connection testing and settings persistence
- Credentials login through `POST /api/settings/emby/login`
- Basic media-server endpoints with Emby active
- Rule creation and rule execution through the Emby adapter path
- Emby ↔ Jellyfin media-server switching and rule migration
- General UI walkthrough with Emby configured

### Explicitly scaffolded or only partially verified

The upstream notes call out these areas as the main follow-up surface:

| Area | Upstream note |
| --- | --- |
| Collection write paths | Implemented, but originally documented as not fully confirmed against a live Emby server |
| Metadata refresh and delete-from-disk flows | Implemented with limited live verification |
| Watch-history fan-out and many rule-property cases | Ported from Jellyfin, but dependent on Emby response shapes |
| Library storage calculations | Implemented with caution around Emby's size aggregation behavior |
| Overlay-related helper paths | Original notes flagged several preview/download helpers for more live verification |

## Deliberate exclusions and feature gaps

### No Emby Connect

The upstream Emby support notes explicitly document why Emby Connect was not shipped:

- the planned reference implementation did not actually exist in Seerr or Jellyseerr
- verified credentials login and direct API-key flows existed already
- guessed `api.emby.media` support was intentionally removed instead of being shipped as unverified behavior

If Emby Connect is ever added, it should be verified against a real Premiere-enabled, Connect-linked Emby server first.

### No native smart collections

The upstream notes also verified that Emby does **not** expose native smart collections compatible with Maintainerr's smart-collection expectations.

### No collection item reorder API

The upstream audit confirmed that Emby exposes only collection display-order settings such as `PremiereDate` or `SortName`; it does not expose the collection item move API that Maintainerr would need for its collection-sort contract.

That is why collection sorting remains unavailable for Emby in the user-facing docs.

## Follow-up audit findings

The upstream `emby-followups.md` document records a post-implementation audit of the Emby adapter. The main findings are summarized here so they remain visible in the docs site.

### High-priority findings from the audit

| Finding | Why it mattered |
| --- | --- |
| Auto-create collection flow could fail against real Emby when creating an empty collection first | Risked 500s during automatic collection creation |
| Show-context episode expansion used the wrong child lookup path | Could return an empty episode list |
| Library cleanup logic inferred the wrong library from collection children | Could leave stale items behind after library switches |
| `getWatchHistory` treated transport failures as an empty watch history | Could make outage conditions look like real "never watched" data |
| Overlay existence checks could misclassify transient failures as item deletion | Risked deleting original-poster backups during an outage |

### Medium and low follow-up notes

| Finding | Upstream recommendation |
| --- | --- |
| `sortTitle` plumbing was incomplete | Run create/update follow-up writes whenever `sortTitle` is present |
| Some auth-header and endpoint comments were stale | Update comments and prefer public Emby endpoints such as `/Users/Query` |
| The login controller originally bypassed shared Zod validation | Align it with the surrounding settings endpoints |
| Onboarding copy still referenced only Plex and Jellyfin | Make the copy media-server agnostic |
| The original upstream verification snippet had an API-key shell-variable bug | Keep the docs copy corrected when reusing the script |

## Contributor guidance

The upstream documents repeatedly emphasize the same rule for Emby work:

1. Reproduce against the same Emby version when possible
2. Verify the real endpoint behavior directly instead of assuming Jellyfin parity
3. Use the Jellyfin adapter as prior art, not as proof
4. Prefer small, focused regression fixes around the documented audit findings

If you are debugging Emby behavior, the adapter, getter, and settings routes should be your first stops.
