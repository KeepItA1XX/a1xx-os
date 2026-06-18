# Phase 95 Pass 1G - Duplicate Session Preview Guard

The preview path blocks bad future sessions before persistence exists.

Preview guards:
- One preview session at a time.
- Session id required before persistence.
- No overlapping live blocks.
- Start time required before closeout.
- End time required before closeout.
- Duration must be positive before write approval.
- Max block cap remains required.

Boundary:
- Guard preview only.
- No session is created or saved.

Next allowed step:
- `phase95_pass1h_fast_qa_gate`
