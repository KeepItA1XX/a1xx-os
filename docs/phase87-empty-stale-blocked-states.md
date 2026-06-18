# Phase 87 Empty Stale Blocked States

Current Phase: Phase 87: First Live Player Data Surfaces
Current Pass: Pass 1E: Empty / Stale / Blocked States
Pass Type: player-safe fallback copy

## Fallbacks

Overview Today must stay useful even when the packet has no player-ready rows.

## States

- Fresh: show the current compact Today rows.
- Aging: show the rows with normal player copy.
- Empty: show that nothing new is queued yet.
- Stale: show that the next move is not refreshed yet.
- Blocked: show that the next move is waiting.
- Error: show a calm fallback without technical detail.

