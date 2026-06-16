# Phase 65 Build Manifest Compaction Plan

## Purpose

This pass plans how Money Mission OS can eventually replace the long live cache-token history with a compact build manifest.

This pass does not change manifest runtime behavior, remove cache-token fragments, remove stamp guards, move runtime code, delete files, change player UI, or enable protected execution.

## Current Phase

- Phase: 65
- Pass: 1F
- Type: build manifest compaction plan / planning only
- Build stamp: `OS v2_5 Phase 65 Weight Control Follow-Through · Pass 1F Build Manifest Compaction Plan`
- Live app: `money-mission-tracker-v2_5.html`
- Cache ownership map: `docs/phase65-cache-ownership-map.md`
- App weight plan: `docs/app-weight-control-system-v1.md`

## Manifest Field Plan

| Field | Current source | Future manifest field |
| --- | --- | --- |
| Current phase | `APP_BUILD_STAMP` | `manifest.currentPhase` |
| Current pass | `APP_BUILD_STAMP` | `manifest.currentPass` |
| Build stamp | `APP_BUILD_STAMP` | `manifest.buildStamp` |
| Feature flags and active contracts | `APP_CACHE_TOKEN` fragments | `manifest.featureFlags` |
| Source map and packet version | Source-map pass receipts | `manifest.sourceMapVersion` |
| Player UI version | Player-surface pass receipts | `manifest.playerUiVersion` |
| Developer receipt archive pointer | Phase 64 archive manifests | `manifest.developerArchivePointer` |
| Protected boundary status | Protected-boundary checks | `manifest.protectedBoundaryStatus` |

## Future Compaction Path

1. Introduce a read-only manifest object beside the existing token.
2. Teach Fast QA to read the manifest while still accepting the token fallback.
3. Move historical token fragments into archive/reference docs.
4. Keep only current pass tokens and archive pointer live.
5. Retire long token history after A1XX-approved verification.

## Boundaries

- No manifest runtime behavior changes in this pass.
- No cache-token removal in this pass.
- No stamp guard removal in this pass.
- No player-facing UI change in this pass.
- Protected actions stay blocked.

## Next Allowed Step

`phase65_pass1g_developer_receipt_archive_pointer_plan`

The next pass should plan how developer receipt detail can point to archives cleanly without forcing old receipt chains to stay live in the main app runtime.
