# Browser QA Closeout - Intel Department Routing and 175% Zoom

Date: 2026-07-18
Approval: `APPROVE STAGE 4 READ-AND-STAGE BETA PRODUCTION-UI BROWSER QA AND VISUAL ACCEPTANCE ONLY`
Disposition: `blocked_before_visual_acceptance_console_error_loadLiveEvents`

## Locked artifact

- Target: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/money-mission-tracker-v2_5.html`
- Target SHA-256: `42d50eca0c072578319fa0a13d01de35f2fbb5035bd989eec852e238c8e54b8d`
- Backup: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/money-mission-tracker-v2_5_backup_2026-07-18_134829_intel-department-routing-175-zoom.html`
- Backup SHA-256: `b3d11a8d1f416bff98c255854de8a5be906d66525a3cad6d4e0548eb783ab04b`
- Implementation closeout: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_BUILD_AGENT_INTEL_DEPARTMENT_ROUTING_AND_175_ZOOM_IMPLEMENTATION_2026-07-18.md`
- Implementation closeout SHA-256: `47ef77e2b7673adfcafc5e4311e11477dfb564648069f5340bba7fb7913eacc1`

## Bounded run

- Local server: `http://127.0.0.1:8765/money-mission-tracker-v2_5.html`
- Browser: Codex In-app Browser
- One fresh tab was created, navigated once, and finalized after the first failure.
- Baseline DOM orientation completed on the initial Today view.
- Department routing, 150%/175% zoom, click-through, narrow/mobile, screenshot, and visual acceptance checks were not run after the failure.

## First failure

The initial page load emitted a console warning containing an application error from `loadLiveEvents`:

`Notion live events 400: {"object":"error","status":400,"code":"validation_error","message":"The property type in the database does not match the property type of the filter provided: database property select does not match filter status","request_id":"53fb3f18-f3c0-4879-acd0-2113b66779ba"}`

The stack identified `loadLiveEvents` at HTML line `50131`, called during `loadTodayData`. This is a live Notion read/query contract failure, outside the approved HTML-only visual acceptance scope. No source repair or retry was performed.

## Cleanup and boundary

- Browser tab finalized with no tab kept.
- Local preview server stopped; port `8765` released.
- No source, Apps Script, Notion, Linear, worker, trigger, dispatch, sync, deployment, beta release, commit, or push action occurred.
- No visual pass/fail claim is made for department routing or 175% zoom because the matrix was blocked before those checks.

## Next gate

The smallest next gate is a separately approved read-only live-query contract reconciliation for `loadLiveEvents` / the `select` versus `status` filter mismatch, followed by a fresh browser QA approval. Do not repair or rerun from this closeout.
