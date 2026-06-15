# Phase 64 Live Weight Move Scope

## Purpose

This scope defines which old receipt groups may be eligible for a later live-weight move. It does not move, remove, delete, or disable live runtime code.

## Current Phase

- Phase: 64
- Pass: 1I
- Type: live weight move scope
- Live app: `money-mission-tracker-v2_5.html`
- Durable manifest: `docs/phase64-receipt-archive-reference-manifest.md`

## Candidate Groups

| Group | Scope | Future move policy |
| --- | --- | --- |
| Historical phase receipts | Older phase receipt chains that only prove prior build readiness. | Candidate for compact pointer replacement after one approved move pass. |
| Historical QA receipts | Deep historical QA receipt blocks that do not need to run in Fast QA. | Candidate for compact pointer replacement after one approved move pass. |
| Developer Mission receipts | Developer-only Mission receipt chains that should not render in player UI. | Candidate for compact pointer replacement after one approved move pass. |

## Must Stay Live

- Current build identity.
- Compact Fast QA lane.
- Current Mission gate.
- Performance guard.
- Protected boundary checks.
- Any player-facing Mission, Profile, Badges, Overview, or Journey UI.
- Any active runtime function used by visible player surfaces.

## Boundaries

- No live move is executed in Pass 1I.
- No function is removed in Pass 1I.
- No file is deleted in Pass 1I.
- No archive execution is enabled in Pass 1I.
- Local runtime archive files remain ignored.
- Player UI remains unchanged.
- Protected actions remain blocked: mission completion writes, XP award writes, notification dispatch, app writes, automations, workers, restore execution, token export, and secret export.

## Next Allowed Step

`phase64_pass1j_live_move_candidate_review`

The next pass may review the candidate groups and choose the first smallest safe move target. It should still avoid deleting files or enabling protected execution.
