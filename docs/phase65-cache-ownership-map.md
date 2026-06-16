# Phase 65 Cache Ownership Map

## Purpose

This pass maps cache ownership before any cache runtime behavior changes. It clarifies what should stay in memory, what can become a compact snapshot, and what should never be stored as a giant rendered payload.

This pass does not change cache runtime behavior, change storage schema, execute lazy loading, move runtime code, delete files, change player UI, or enable protected execution.

## Current Phase

- Phase: 65
- Pass: 1E
- Type: cache ownership map / planning only
- Build stamp: `OS v2_5 Phase 65 Weight Control Follow-Through · Pass 1E Cache Ownership Map`
- Live app: `money-mission-tracker-v2_5.html`
- Lazy-load dependency map: `docs/phase65-lazy-load-dependency-map.md`
- App weight plan: `docs/app-weight-control-system-v1.md`

## Cache Owners

| Cache | Owner | Storage | Shape | Invalidate when |
| --- | --- | --- | --- | --- |
| Current mission payload cache | mission player runtime | Memory | Small object summary plus active room signature | Mission id, step count, focus lane, or run status changes |
| Badge, trophy, resource, and roadmap summary cache | game data catalogs | Memory with compact snapshot candidate | Paged summaries, icon ids, lock state, selected item id | Catalog version, selected shelf page, or resource unlock state changes |
| Notion, Sheets, Drive, and time packet cache | source bridge | Compact local snapshot only after approved read | Packet key, freshness, row count, safe rows, fallback copy | Manual refresh approval, freshness timeout, or source map version changes |
| Route and render signature cache | render scheduler | Memory | Route, tab, lens, payload signature, last render time | Route, visible tab, or payload signature changes |
| Developer receipt reference cache | Developer Control Room | Manifest pointer only | Phase, pass, archive pointer, QA status, manual open flag | Phase closeout, archive manifest, or manual Deep QA action changes |

## Cache Rules

- Do not store long rendered HTML strings as durable cache.
- Use memory cache for active gameplay surfaces.
- Use local snapshots only for compact source or catalog state.
- Check signatures before rebuilding repeated rooms.
- Developer receipt detail stays manual, not startup cache.

## Boundaries

- No new cache runtime behavior in this pass.
- No localStorage or IndexedDB schema change in this pass.
- No player-facing UI change in this pass.
- Protected actions stay blocked.

## Next Allowed Step

`phase65_pass1f_build_manifest_compaction_plan`

The next pass should plan how the current long cache-token history can eventually become a compact build manifest without breaking build identity, Fast QA, or historical receipt references.
