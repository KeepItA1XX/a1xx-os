# Phase 64 Receipt Archive Reference Manifest

## Purpose

This committed manifest is the durable reference path for Phase 64 archive cleanup. Local archive receipts under `Archives/runtime_weight_archive/` are intentionally ignored and stay local-only. Future live-runtime weight moves must point to this committed manifest, not to ignored local archive files.

## Current Phase

- Phase: 64
- Pass: 1Y
- Type: durable docs manifest + developer Mission receipt dry-run final review
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
| Developer Mission receipt dry-run plan | `docs/phase64-developer-mission-receipt-dry-run-plan.md` | none | Dry run is plan-only; file move, pointer shell creation, and execution remain blocked. |
| Developer Mission receipt dry-run preflight | `docs/phase64-developer-mission-receipt-dry-run-preflight.md` | none | Dry run is preflighted; simulation, file move, pointer shell creation, and execution remain blocked. |
| Developer Mission receipt dry-run approval gate | `docs/phase64-developer-mission-receipt-dry-run-approval-gate.md` | none | A1XX approval is required before dry-run simulation; dry-run arm and execution remain blocked. |
| Developer Mission receipt dry-run local arm preview | `docs/phase64-developer-mission-receipt-dry-run-local-arm-preview.md` | none | Dry-run local arm is preview-only; approval storage, simulation, and execution remain blocked. |
| Developer Mission receipt dry-run final review | `docs/phase64-developer-mission-receipt-dry-run-final-review.md` | none | Final review is documentation-only; simulation, approval storage, file movement, and deletion remain blocked. |
| Fast QA compact boundary | `money-mission-tracker-v2_5.html` | `live_fast_qa` | Keep the compact Fast QA row live. Do not move it into ignored archive files. |
| App weight plan | `docs/app-weight-control-system-v1.md` | none | Keep the long-term weight-control policy committed. |

## Boundaries

- Historical QA pointer move executed in Pass 1O and closed out in Pass 1P.
- Developer Mission receipt cleanup was planned in Pass 1Q, preflighted in Pass 1R, approval-gated in Pass 1S, local-arm previewed in Pass 1T, dry-run planned in Pass 1U, dry-run preflighted in Pass 1V, dry-run approval-gated in Pass 1W, dry-run local-arm previewed in Pass 1X, and final-reviewed in Pass 1Y; no developer receipt move is executed.
- No live function name is removed in Pass 1Y.
- No file is deleted in Pass 1Y.
- Local runtime archive files remain ignored.
- Fast QA must not require ignored archive files.
- Player UI remains unchanged.
- Protected actions remain blocked: mission completion writes, XP award writes, notification dispatch, app writes, automations, workers, restore execution, token export, and secret export.

## Next Allowed Step

`phase64_pass1z_receipt_archive_candidate_closeout`

The next pass may close out the Phase 64 receipt archive candidate. It must still avoid deletion, keep developer-only receipts out of player-facing UI, and must not execute another move unless A1XX explicitly approves execution.
