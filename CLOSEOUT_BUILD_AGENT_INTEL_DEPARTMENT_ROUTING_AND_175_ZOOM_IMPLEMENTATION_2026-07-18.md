# Build Agent Closeout - Intel Department Routing and 175% Zoom Implementation

Date: 2026-07-18
Lane: Build-owned local production UI implementation
Disposition: implemented_static_verified_browser_visual_acceptance_pending

## Target and predecessor

- Target: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/money-mission-tracker-v2_5.html`
- Post-edit SHA-256: `42d50eca0c072578319fa0a13d01de35f2fbb5035bd989eec852e238c8e54b8d`
- Timestamped backup: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/money-mission-tracker-v2_5_backup_2026-07-18_134829_intel-department-routing-175-zoom.html`
- Backup SHA-256: `b3d11a8d1f416bff98c255854de8a5be906d66525a3cad6d4e0548eb783ab04b`
- Apps Script: not edited by this pass. The worktree already contained a separate Apps Script modification (`100` insertions, `0` deletions); it remains untouched.

## Implemented scope

1. Removed the live-registry path that appended `Unassigned / Operations Review` as a synthetic department.
2. Routed unresolved live jobs and outputs to the real `Operations` department when present, with `Fulfillment` as the named fallback.
3. Added a fail-closed return when unresolved records exist but neither real routing department is available.
4. Added a named inline-size container to the selected department workspace.
5. At selected-workspace width `780px` or below, stacked the lane body, moved the lane readout below the copy, reduced metrics to two columns, and constrained action buttons to readable columns.
6. At selected-workspace width `560px` or below, stacked metrics and actions to one column.

The eight primary department IDs remain derived only from the real live `departments` collection. No synthetic department is added to `INTEL_AGENT_IDS` or the registry's top-level department list.

## Verification

- Inline JavaScript extracted from the HTML and passed `node --check`.
- Routing assertions passed: no synthetic department append, Operations preference, Fulfillment fallback, fail-closed guard, unresolved job/output routing, and real-department ID derivation.
- Responsive assertions passed: scoped `intel-dept-captain` container, `780px` stack threshold, and `560px` single-column threshold.
- Forbidden-surface scan passed for the edited registry block: no new `google.script.run`, storage writes, beacon, WebSocket, IndexedDB, or `postMessage` surface.
- Backup integrity passed; predecessor backup remains byte-distinct from the edited target.
- Narrow logical diff: `20` additions and `9` deletions across the registry and department-workspace CSS boundary. The monolithic HTML file reports a larger `git diff --numstat` because the CSS and script are stored on long source lines.
- No browser, server, deployment, sync, beta, commit, push, Apps Script edit, or official app update was performed.

## Next gate

`APPROVE STAGE 4 READ-AND-STAGE BETA PRODUCTION-UI BROWSER QA AND VISUAL ACCEPTANCE ONLY`

That next gate should verify the eight-card department surface, Operations-contained unresolved records, and the selected department workspace at 150% and 175%, plus the existing narrow/mobile and accessibility checks. This closeout does not claim runtime visual acceptance or authorize deployment.
