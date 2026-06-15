# Phase 64 Live Move Candidate Review

## Purpose

This review chooses the smallest first candidate group for a future live-weight cleanup move. It does not move, remove, delete, or disable live runtime code.

## Current Phase

- Phase: 64
- Pass: 1J
- Type: candidate review / no move yet
- Live app: `money-mission-tracker-v2_5.html`
- Durable manifest: `docs/phase64-receipt-archive-reference-manifest.md`
- Scope map: `docs/phase64-live-weight-move-scope.md`

## Candidate Ranking

| Rank | Group | Reason | Decision |
| --- | --- | --- | --- |
| 1 | Historical QA receipts | Lowest player-facing risk because Fast QA already stays compact and deep historical QA does not need to render in the daily lane. | Recommended first review target. |
| 2 | Historical phase receipts | Good second candidate, but phase chain receipts may still be useful while the archive cleanup pattern is new. | Hold for later review. |
| 3 | Developer Mission receipts | Valuable weight target, but Mission-related receipt chains need extra care because Mission surfaces have been performance-sensitive. | Hold for later review. |

## Must Stay Live

- Compact Fast QA lane.
- Current build identity.
- Current Mission gate.
- Phase 63 performance guard.
- Phase 64 receipt archive checks.
- Player-facing Account, Mission, Profile, Badges, Overview, Journey, Resources, and Command surfaces.

## Review Decision

The first future cleanup candidate is `historical_qa_receipts`.

That means the next pass may prepare a no-delete move plan for historical QA receipt blocks only. It should still avoid executing the move unless A1XX approves the exact move pass.

## Boundaries

- No live move is executed in Pass 1J.
- No function is removed in Pass 1J.
- No file is deleted in Pass 1J.
- No archive execution is enabled in Pass 1J.
- Player UI remains unchanged.
- Protected actions remain blocked: mission completion writes, XP award writes, notification dispatch, app writes, automations, workers, restore execution, token export, and secret export.

## Next Allowed Step

`phase64_pass1k_historical_qa_move_plan`

The next pass may prepare the no-delete move plan for historical QA receipts only.
