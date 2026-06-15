# Phase 64 Historical QA Move Approval Gate

## Purpose

This gate records the exact approval boundary before any historical QA cleanup move can execute. It does not move, remove, delete, or disable live runtime code.

## Current Phase

- Phase: 64
- Pass: 1M
- Type: approval gate / execution blocked
- Live app: `money-mission-tracker-v2_5.html`
- Preflight: `docs/phase64-historical-qa-move-preflight.md`
- Move plan: `docs/phase64-historical-qa-move-plan.md`

## Approval Boundary

The only eligible target is `historical_qa_receipts`.

Execution is not approved in this pass. A future execution pass must be explicitly approved by A1XX and must name:

- the target group,
- the exact source blocks,
- the compact pointer replacement,
- the rollback backup,
- the post-move verification steps.

## Gate Rules

| Rule | Requirement | Status |
| --- | --- | --- |
| A1XX approval required | The exact execution pass must be approved before any move. | Held |
| Target locked | The only eligible target is `historical_qa_receipts`. | Ready |
| Pointer-only future move | Future move can only replace old QA receipt bulk with compact manifest pointers. | Ready |
| No delete path | No deletion is allowed. | Ready |
| Rollback required | Timestamped backup must exist before execution. | Ready |
| Post-move checks required | Script parse, protected-action scan, source proof, and Fast QA must run after any future move. | Ready |

## Must Stay Live

- Compact Fast QA lane.
- Current build identity.
- Current Mission gate.
- Phase 63 performance guard.
- Phase 64 archive checks.
- Player-facing Account, Mission, Profile, Badges, Overview, Journey, Resources, and Command surfaces.
- Historical phase receipts.
- Developer Mission receipts.

## Boundaries

- No move is executed in Pass 1M.
- No approval is armed for execution in Pass 1M.
- No function is removed in Pass 1M.
- No file is deleted in Pass 1M.
- No archive execution is enabled in Pass 1M.
- Player UI remains unchanged.
- Protected actions remain blocked: mission completion writes, XP award writes, notification dispatch, app writes, automations, workers, restore execution, token export, and secret export.

## Next Allowed Step

`phase64_pass1n_historical_qa_execution_candidate`

The next pass may prepare the exact execution candidate packet. Execution should still remain blocked unless A1XX explicitly approves that exact execution pass.
