# Milestone 01 Phase B Stage B3 Projects Read-Only Consumer
## Browser Acceptance Predicate Scope Clarification Decision Packet

- Date: 2026-07-18
- Agent: Codex / Official Build Agent
- Authority: `APPROVE MILESTONE 01 PHASE B STAGE B3 PROJECTS READ-ONLY CONSUMER BROWSER ACCEPTANCE PREDICATE SCOPE CLARIFICATION DECISION ONLY`
- Packet purpose: docs-only acceptance-boundary clarification; no browser or runtime execution
- Proposed disposition: `predicate_scope_clarification_defined_runtime_provenance_lane_remains_parked`

## Control locks

- Controlling closeout: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_MILESTONE_01_PHASE_B_STAGE_B3_PROJECTS_READ_ONLY_CONSUMER_STATIC_EVIDENCE_ACCEPTANCE_AND_RUNTIME_PROVENANCE_BLOCKER_CLOSURE_2026-07-18.md`
- Controlling closeout SHA-256: `c61707b94bd800f11bc02d22445c81658c333c27c194dd4e5c59f4095c3cad37`
- Target HTML SHA-256: `5a184045a54e29f4b8eb9e79ce83bcf81b79914a717f1ac7cf2764661d40ba63`
- Apps Script SHA-256: `b37a6964f4d8a304bfb24a3d58894fc2e2c65fd65f4ea294ccdf6dc226ee3bf8`
- Static B3 acceptance closeout SHA-256: `57ebda65570d2c409ea3ed458479125a5f7e2a1a235889980f7e0f4c54321770`
- Runtime provenance lane: closed and parked under the controlling closeout; this packet does not reopen it.

## Decision

Accept one narrow predicate clarification for a future B3 browser acceptance pass: forbidden fallback/demo/transport copy is evaluated only on app-owned presentation surfaces. Text values supplied through the approved source-backed Project fields are data, not app fallback copy, and are excluded from that predicate.

The prior whole-section text scan was too broad because it searched the combined Projects section for `fallback`, among other terms. That scan can classify a legitimate source-backed `Outcome` value such as `safe fallback` as an app-generated fallback. The clarification changes the assertion boundary, not the source value, renderer output, packet contract, or allowlist.

## Exact B3 predicate boundary

### Included app-owned surfaces

The future `no_generated_fallback_copy` assertion may inspect only text owned by the B3 consumer shell:

1. The Projects section heading and explanatory copy.
2. Packet source-mode, status, freshness, and last-verified labels.
3. The empty-state message shown when the approved project array is empty.
4. App-generated field labels, row-count/cap labels, and other structural labels.
5. App-generated action, draft, transport, relay, demo, sample, or load-state copy within the B3 consumer shell.

For the included text set, fail on case-insensitive occurrences of: `draft`, `save draft`, `fallback`, `sample`, `demo`, `relay is available`, or `open planning to load`, unless a future separately approved contract explicitly permits that exact app-owned phrase.

### Explicitly excluded source-backed values

Do not include the text content of any value node rendered from these eight approved fields:

`title`, `project_type`, `status`, `priority`, `current_next_move`, `outcome`, `needs_a1xx_review`, and `closest_to_money`.

The `Outcome` value is specifically excluded from the generated-fallback-copy scan. The exact source-backed value must remain visible and unchanged; the predicate must not sanitize, rewrite, replace, or classify it as app fallback merely because it contains a forbidden-word token.

The exclusion applies only to the field value text. Structural labels, status badges, freshness labels, empty-state copy, and generated controls remain included even when adjacent to a field value.

## Future acceptance assertions

Once this packet is separately accepted for execution, a bounded B3 browser pass may retain these existing checks:

- B3 host renders from the locked HTML.
- Source/status/freshness state is present and safe.
- The eight approved fields are the only Project data fields displayed.
- Project rows are capped at 50.
- No action, draft, transport, demo-record, or app-generated fallback path is present.
- The scoped app-owned text set contains none of the disallowed generated-copy tokens.
- Source-backed field values are not altered by the assertion.

These assertions do not create a source-data provenance claim. The parked runtime provenance blocker remains a separate evidence boundary.

## Stop conditions

Stop before acceptance if any of the following occurs:

- The packet, HTML, or Apps Script hash differs from the locks above.
- The B3 container cannot distinguish app-owned shell text from approved source-field values.
- The renderer changes the approved eight-field allowlist, 50-row cap, packet/cache reuse, or freshness behavior.
- A disallowed token appears in an included app-owned surface.
- A source-backed field value is rewritten, omitted, or falsely reported as app fallback.
- The runtime provenance route is implicitly reopened, or a canonical-ID/source readback is requested.
- Any browser, server, source readback, edit, deployment, write, retry, sync, beta, commit, or push action is required.

## Exclusions

This is a docs-only decision packet. It performs no browser/server work, source-data read, title/Outcome inspection, HTML or Apps Script edit, relay call, deployment, retry, fallback, data write, sync, beta activation, commit, or push. It does not authorize official app readiness or release.

## Exact next gate

`APPROVE MILESTONE 01 PHASE B STAGE B3 PROJECTS READ-ONLY CONSUMER BROWSER ACCEPTANCE PREDICATE SCOPE CLARIFICATION ACCEPTANCE ONLY`

That gate accepts or rejects this predicate boundary. It does not execute browser acceptance and does not reopen the parked runtime provenance lane.
