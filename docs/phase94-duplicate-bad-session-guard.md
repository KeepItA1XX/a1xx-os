# Phase 94 Pass 1F - Duplicate / Bad Session Guard

Future time-session rows need guardrails before writes can exist.

Guards:
- One open session at a time.
- Unique session id.
- No overlapping time range.
- Start and end are required.
- Positive duration is required.
- Max block cap is required.

Boundary:
- Guard contract only. No session write or cleanup execution.

Next allowed step:
- `phase94_pass1g_player_safe_approval_copy`
