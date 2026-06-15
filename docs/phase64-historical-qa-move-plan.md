# Phase 64 Historical QA Move Plan

## Purpose

This plan prepares the first no-delete cleanup path for historical QA receipt weight. It does not move, remove, delete, or disable live runtime code.

## Current Phase

- Phase: 64
- Pass: 1K
- Type: historical QA move plan / execution blocked
- Live app: `money-mission-tracker-v2_5.html`
- Durable manifest: `docs/phase64-receipt-archive-reference-manifest.md`
- Candidate review: `docs/phase64-live-move-candidate-review.md`

## Planned Target

The only target for the future move is `historical_qa_receipts`.

This target covers old deep QA receipt chains that do not need to run inside the compact daily Fast QA lane.

## Future Move Steps

| Step | Action | Status |
| --- | --- | --- |
| 1 | Confirm the historical QA receipt source markers are captured in docs. | Ready |
| 2 | Keep compact Fast QA and current Mission gate live in the app. | Ready |
| 3 | Replace only old historical QA receipt bulk with a compact manifest pointer in a future approved move pass. | Blocked |
| 4 | Run script parse, protected-action scan, source proof, and Fast QA after the future move. | Blocked |
| 5 | Keep rollback path available through the timestamped pre-move backup. | Ready |

## Must Not Move

- Compact Fast QA lane.
- Current build identity.
- Current Mission gate.
- Phase 63 performance guard.
- Phase 64 archive checks.
- Player-facing Account, Mission, Profile, Badges, Overview, Journey, Resources, and Command surfaces.
- Historical phase receipts.
- Developer Mission receipts.

## Boundaries

- No move is executed in Pass 1K.
- No function is removed in Pass 1K.
- No file is deleted in Pass 1K.
- No archive execution is enabled in Pass 1K.
- Player UI remains unchanged.
- Protected actions remain blocked: mission completion writes, XP award writes, notification dispatch, app writes, automations, workers, restore execution, token export, and secret export.

## Next Allowed Step

`phase64_pass1l_historical_qa_move_preflight`

The next pass may run a final preflight for the historical QA move plan. It should still avoid executing the move unless A1XX approves that exact move pass.
