# Phase 64 Receipt Archive Reference Manifest

## Purpose

This committed manifest is the durable reference path for Phase 64 archive cleanup. Local archive receipts under `Archives/runtime_weight_archive/` are intentionally ignored and stay local-only. Future live-runtime weight moves must point to this committed manifest, not to ignored local archive files.

## Current Phase

- Phase: 64
- Pass: 1P
- Type: durable docs manifest + historical QA post-move closeout
- Live app: `money-mission-tracker-v2_5.html`
- App weight plan: `docs/app-weight-control-system-v1.md`

## Reference Locations

| Reference | Durable path | Local-only path | Policy |
| --- | --- | --- | --- |
| Historical phase receipts | `docs/phase64-receipt-archive-reference-manifest.md` | `Archives/runtime_weight_archive/phase64_receipt_archive_execution_candidate/historical_phase_receipts.md` | Use this committed docs manifest as the future live pointer. |
| Historical QA receipts | `docs/phase64-receipt-archive-reference-manifest.md` | `Archives/runtime_weight_archive/phase64_receipt_archive_execution_candidate/historical_qa_receipts.md` | Live Deep QA now uses this committed docs manifest as its compact pointer. |
| Developer Mission receipts | `docs/phase64-receipt-archive-reference-manifest.md` | `Archives/runtime_weight_archive/phase64_receipt_archive_execution_candidate/developer_mission_receipts.md` | Use this committed docs manifest as the future live pointer. |
| Fast QA compact boundary | `money-mission-tracker-v2_5.html` | `live_fast_qa` | Keep the compact Fast QA row live. Do not move it into ignored archive files. |
| App weight plan | `docs/app-weight-control-system-v1.md` | none | Keep the long-term weight-control policy committed. |

## Boundaries

- Historical QA pointer move executed in Pass 1O and closed out in Pass 1P.
- No live function name is removed in Pass 1P.
- No file is deleted in Pass 1P.
- Local runtime archive files remain ignored.
- Fast QA must not require ignored archive files.
- Player UI remains unchanged.
- Protected actions remain blocked: mission completion writes, XP award writes, notification dispatch, app writes, automations, workers, restore execution, token export, and secret export.

## Next Allowed Step

`phase64_pass1q_developer_mission_receipt_move_plan`

The next pass may plan the developer Mission receipt cleanup path. It should still avoid deletion and must keep developer-only receipts out of player-facing UI.
