# Milestone 01 Phase B Stage B3 Projects Identity Capture Marker-Binding Reconciliation

- Date: 2026-07-18 15:25 ET
- Agent: Codex / Official Build Agent
- Authority: `APPROVE MILESTONE 01 PHASE B STAGE B3 PROJECTS READ-ONLY CONSUMER OUTCOME-SOURCE READBACK IDENTITY CAPTURE MARKER-BINDING RECONCILIATION PACKET PREPARATION ONLY`
- Disposition: `marker_absent_due_initial_null_binding_before_refresh_or_cache_restore_future_binding_timing_locked`

## Control and Provenance

- Control closeout: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_MILESTONE_01_PHASE_B_STAGE_B3_PROJECTS_READ_ONLY_CONSUMER_OUTCOME_SOURCE_READBACK_IDENTITY_CAPTURE_EXECUTION_2026-07-18.md`
- Control closeout SHA-256: `14bc3b1de5dcf73f9128a2866525dc3ab32be6c414004a7d84a7452311b029a1`
- Prior identity reconciliation packet SHA-256: `5b35fb5a9de88761e8418bed1a890244b16da1e7235fb5b673149cb986fdaa61`
- Target HTML SHA-256: `5a184045a54e29f4b8eb9e79ce83bcf81b79914a717f1ac7cf2764661d40ba63`
- Apps Script SHA-256: `b37a6964f4d8a304bfb24a3d58894fc2e2c65fd65f4ea294ccdf6dc226ee3bf8`

## Exact Runtime Binding

- Runtime binding: `PLANNING_LIVE_CONTEXT_V1`, initialized to `null` at `money-mission-tracker-v2_5.html:164642`.
- Cache key: `PLANNING_LIVE_CONTEXT_CACHE_KEY_V1 = 'planning_live_context_v1'` at `:164645`.
- Cache accessor: `planningLiveRestoreCacheV1()` at `:164660`; it returns a cache only when the parsed object has `packet === 'planning_live_context_v1'` and `ok === true`.
- Existing packet writer: `planningLiveCacheV1(packet)` at `:164655-164658`; it preserves the packet marker, source mode, generated time, freshness, complete normalized project objects, tasks, warnings, errors, and write-blocked metadata.
- Existing Projects render read: `renderPlanningLiveProjectsContextV1()` at `:164702-164713`; it resolves `PLANNING_LIVE_CONTEXT_V1 || planningLiveRestoreCacheV1()` and renders immediately from that object.

## Initialization Timing Finding

`initPlanningLiveContextV1()` at `:164771-164781` does the following in order:

1. Sets the one-time init guard.
2. Immediately renders Today and Projects from the current binding/cache.
3. Registers visibility-change and five-minute interval callbacks.
4. Wraps `renderManagerV3PlannerV25` so a later planner render may refresh when `planningLiveSurfaceVisibleV1()` is true.
5. Does not call `refreshPlanningLiveContextV1()` directly during initialization.

The refresh path at `:164742-164757` is the only existing packet-binding path. It first checks the current binding/cache, then calls the existing `getAppsScriptJson('planning_live_context_v1', {}, {timeoutMs:30000,tries:1})` path only when refresh is needed. On a successful packet it assigns `PLANNING_LIVE_CONTEXT_V1 = packet`, clears the last error, writes the validated cache, and re-renders. On failure it attempts the validated cache restore.

Therefore the prior one-shot capture saw the expected initial state: the binding was still `null` and no validated cache was available at evaluation time. This is a timing/binding absence, not evidence that the normalized packet lacks an ID.

## Smallest Future One-Shot Binding Method

At a separately approved future pass, capture only after the existing refresh/cache binding has completed, using this order:

1. Read `PLANNING_LIVE_CONTEXT_V1 || planningLiveRestoreCacheV1()` once.
2. Require the packet marker `planning_live_context_v1`, `ok === true`, non-empty source mode, generated timestamp, freshness state, and a non-empty Projects array.
3. Capture only each normalized project's exact `id`, its `last_edited_at` provenance, packet generated/freshness metadata, and uniqueness counts.
4. Stop immediately if the binding/cache is still absent. Do not call another accessor, query by title, inspect Outcome, inspect DOM order, retry, or use an alternate mechanism.

The future pass may use the already-existing `refreshPlanningLiveContextV1(false)` completion boundary once if that is the packet-approved way to make the current binding available; the identity capture itself must read the resulting in-memory packet/cache object only and must not expose the source row or any additional fields.

## Stop Conditions and Exclusions

- Stop on missing marker, `ok !== true`, missing source mode, missing generated/freshness metadata, empty Projects array, empty/duplicate IDs, or any binding/cache drift.
- Exclude title matching, Outcome matching, DOM order, broad queries, alternate connectors, raw source properties, contacts, URLs, attachments, content blocks, relations, writes, and actions.
- This packet performs no browser/server action, ID capture, source readback, HTML/Apps Script edit, relay/deployment, retry, sync, beta, commit, or push.

## Exact Next Gate

`APPROVE MILESTONE 01 PHASE B STAGE B3 PROJECTS READ-ONLY CONSUMER OUTCOME-SOURCE READBACK IDENTITY CAPTURE PACKET-BINDING EXECUTION ONLY`
