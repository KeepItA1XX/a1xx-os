# Milestone 01 Phase B Stage B3 Projects Outcome Source Readback Decision

- Date: 2026-07-18 15:18 ET
- Agent: Codex / Official Build Agent
- Authority: `APPROVE MILESTONE 01 PHASE B STAGE B3 PROJECTS READ-ONLY CONSUMER OUTCOME-SOURCE READBACK DECISION ONLY`
- Disposition: `readback_contract_prepared_exact_identity_required_no_readback_performed`

## Controlling Evidence

- Reconciliation packet: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/PACKET_MILESTONE_01_PHASE_B_STAGE_B3_PROJECTS_READ_ONLY_CONSUMER_BROWSER_FAILURE_RECONCILIATION_2026-07-18.md`
- Reconciliation packet SHA-256: `150916ac3e7d7c4689fab21a02048e4fa8a33fbebfe83ae9d27acf6ef20945be`
- Browser failure closeout SHA-256: `f39e1fc09528dad8819512fc0abe9c0e7a129632e791e17f710d7a8a06993b36`
- Target HTML SHA-256: `5a184045a54e29f4b8eb9e79ce83bcf81b79914a717f1ac7cf2764661d40ba63`
- Apps Script SHA-256: `b37a6964f4d8a304bfb24a3d58894fc2e2c65fd65f4ea294ccdf6dc226ee3bf8`

## Decision

The minimum safe evidence is one exact source-row readback for the same project record that produced the browser value. A title-only search or broad Projects query is not sufficient because it cannot prove canonical identity and could expose unrelated records.

The future readback must first establish a single canonical project ID from an already-authorized packet or source identity. If no exact ID is available, stop before the read and classify the gate as identity-blocked. Do not infer identity from title, Outcome text, row position, or visual order.

## Required Readback Schema

Return exactly one bounded evidence object containing only:

- `source`: the approved Projects source identifier, without secret or connector details.
- `canonical_project_id`: the exact source page/data-source row ID.
- `canonical_title`: the source title for identity confirmation.
- `outcome_property_name`: only `Outcome / Definition of Done` or `Outcome`.
- `source_outcome_text`: the raw plain-text value of that one property.
- `packet_outcome_text`: the corresponding `planning_live_context_v1.projects[]` value.
- `normalized_outcome_text`: the value after the existing read-only normalization path.
- `exact_text_match`: boolean comparison of source, packet, and normalized values.
- `source_last_edited_at`: source freshness metadata only.
- `packet_generated_at`: packet provenance metadata only.
- `freshness_state`: the existing packet freshness state.
- `read_status`: `exact_match`, `source_mismatch`, or `identity_blocked`.

No other source property may be returned. Exclude contact/client data, raw URLs, attachments, content blocks, relations, permissions, secrets, connector metadata, and all write or action fields.

## Decision Rules

- `exact_match`: the canonical ID matches, the source Outcome text exactly matches the packet value, and the normalized value is unchanged. Classify `safe_fallback_phrase_is_legitimate_source_data`; the prior browser failure was an acceptance-predicate scope mismatch, not an app fallback injection.
- `source_mismatch`: the canonical ID matches but source and packet text differ. Stop and prepare a separate packet-normalization investigation; do not sanitize or repair in place.
- `identity_blocked`: the canonical ID cannot be established uniquely. Stop without reading rows or using a title-based fallback.

## Preserved Boundaries

- This packet performs no source readback.
- No browser rerun, screenshot, console scan, HTML or Apps Script edit, relay invocation, deployment, Notion/data write, retry, sync, beta, commit, or push.
- The eight approved Projects display fields remain unchanged; this decision reads only the Outcome origin needed to classify the prior failure.

## Exact Next Gate

`APPROVE MILESTONE 01 PHASE B STAGE B3 PROJECTS READ-ONLY CONSUMER OUTCOME-SOURCE READBACK EXECUTION ONLY`
