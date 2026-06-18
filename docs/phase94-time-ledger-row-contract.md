# Phase 94 Pass 1C - Time Ledger Row Contract

Future time rows require a stable shape before write approval.

Required fields:
- `sessionId`
- `startedAtEt`
- `endedAtEt`
- `timezone`
- `cycleId`
- `campaignId`
- `batchLane`
- `missionId`
- `missionTitle`
- `moveId`
- `actionType`
- `durationMinutes`
- `pausedMinutes`
- `proof`
- `result`
- `debrief`
- `createdFrom`
- `approvalId`

Boundary:
- Contract only. No row creation, update, sync, export, award, or notification execution.

Next allowed step:
- `phase94_pass1d_approval_criteria_checklist`
