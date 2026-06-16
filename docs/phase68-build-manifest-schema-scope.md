# Phase 68 Build Manifest Schema Scope

## Purpose

Phase 68 starts the replacement plan for the giant `APP_CACHE_TOKEN` history. This pass maps what the cache token currently does and defines the compact manifest shape that can eventually replace the long string with pointers.

This pass does not remove the existing cache token and does not activate a manifest runtime.

## Current Build

- Current Phase: Phase 68 Build Manifest Replacement
- Current Pass: Pass 1A Manifest Schema Scope
- Pass Type: manifest schema scope / planning only
- Build stamp: OS v2_5 Phase 68 Build Manifest Replacement · Pass 1A Manifest Schema Scope
- Next allowed step: `phase68_pass1b_shadow_manifest_contract`

## Current Cache Token Roles

| Current Role | Current Source | Future Manifest Field |
| --- | --- | --- |
| Current build identity | `APP_BUILD_STAMP` and `APP_BRAIN_BUILD` | `build.current` |
| Feature/pass tokens | `APP_CACHE_TOKEN` append chain | `features.enabled` |
| Protected boundary status | phase receipt booleans and QA scans | `protectedBoundary` |
| Fast QA active receipt pointer | latest phase QA function | `qa.fastLane.pointer` |
| Historical receipt archive pointer | docs archive references | `archives.receipts` |
| Source-map and catalog versions | phase source contracts | `sources.versions` |

## Planned Manifest Fields

- `manifestVersion`
- `build`
- `features`
- `qa`
- `archives`
- `sources`
- `protectedBoundary`
- `migration`

## Migration Rules

1. Add a shadow manifest beside the existing cache token before replacement.
2. Do not remove the existing cache token string in Pass 1A.
3. Point to archive receipts instead of embedding history.
4. Keep Fast QA focused on the latest receipt plus compact pointers.
5. Keep `APP_CACHE_TOKEN` as fallback until the manifest is proven.
6. Keep archive movement manual and separately approved.

## Boundaries

- No manifest runtime is activated in this pass.
- No cache token removal in this pass.
- No archive movement in this pass.
- No player UI change in this pass.
- No mission completion writes, XP award writes, notification dispatch, app writes, restore execution, workers, automations, token export, or secret export.

## Next Allowed Step

`phase68_pass1b_shadow_manifest_contract`
