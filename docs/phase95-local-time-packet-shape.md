# Phase 95 Pass 1B - Local Time Packet Shape

The local preview packet uses one future time-session row.

Preview fields:
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
- One preview row only.
- No saving.
- No cloud writes.

Next allowed step:
- `phase95_pass1c_button_intent_map`
