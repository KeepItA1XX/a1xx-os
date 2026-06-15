# Phase 64 Receipt Archive Reference Manifest

## Purpose

This committed manifest is the durable reference path for Phase 64 archive cleanup. Local archive receipts under `Archives/runtime_weight_archive/` are intentionally ignored and stay local-only. Future live-runtime weight moves must point to this committed manifest, not to ignored local archive files.

## Current Phase

- Phase: 64
- Pass: 1T
- Type: durable docs manifest + developer Mission receipt local arm preview
- Live app: `money-mission-tracker-v2_5.html`
- App weight plan: `docs/app-weight-control-system-v1.md`

## Reference Locations

| Reference | Durable path | Local-only path | Policy |
| --- | --- | --- | --- |
| Historical phase receipts | `docs/phase64-receipt-archive-reference-manifest.md` | `Archives/runtime_weight_archive/phase64_receipt_archive_execution_candidate/historical_phase_receipts.md` | Use this committed docs manifest as the future live pointer. |
| Historical QA receipts | `docs/phase64-receipt-archive-reference-manifest.md` | `Archives/runtime_weight_archive/phase64_receipt_archive_execution_candidate/historical_qa_receipts.md` | Live Deep QA now uses this committed docs manifest as its compact pointer. |
| Developer Mission receipts | `docs/phase64-receipt-archive-reference-manifest.md` | `Archives/runtime_weight_archive/phase64_receipt_archive_execution_candidate/developer_mission_receipts.md` | Use this committed docs manifest as the future live pointer. |
| Developer Mission receipt preflight | `docs/phase64-developer-mission-receipt-move-preflight.md` | none | Source blocks are identified; execution remains blocked. |
| Developer Mission receipt approval gate | `docs/phase64-developer-mission-receipt-move-approval-gate.md` | none | A1XX approval is required; local arm and execution remain blocked. |
| Developer Mission receipt local arm preview | `docs/phase64-developer-mission-receipt-local-arm-preview.md` | none | Local arm is preview-only; approval capture and execution remain blocked. |
| Fast QA compact boundary | `money-mission-tracker-v2_5.html` | `live_fast_qa` | Keep the compact Fast QA row live. Do not move it into ignored archive files. |
| App weight plan | `docs/app-weight-control-system-v1.md` | none | Keep the long-term weight-control policy committed. |

## Boundaries

- Historical QA pointer move executed in Pass 1O and closed out in Pass 1P.
- Developer Mission receipt cleanup was planned in Pass 1Q, preflighted in Pass 1R, approval-gated in Pass 1S, and local-arm previewed in Pass 1T; no developer receipt move is executed.
- No live function name is removed in Pass 1T.
- No file is deleted in Pass 1T.
- Local runtime archive files remain ignored.
- Fast QA must not require ignored archive files.
- Player UI remains unchanged.
- Protected actions remain blocked: mission completion writes, XP award writes, notification dispatch, app writes, automations, workers, restore execution, token export, and secret export.

## Next Allowed Step

`phase64_pass1u_developer_mission_receipt_dry_run_plan`

The next pass may define a dry-run plan for the developer Mission receipt pointer move. It must still avoid deletion, keep developer-only receipts out of player-facing UI, and must not execute a move unless A1XX explicitly approves execution.
