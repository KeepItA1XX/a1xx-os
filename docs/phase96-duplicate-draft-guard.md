# Phase 96 Pass 1D - Duplicate Draft Guard

Phase 96 blocks duplicate local time drafts by mission.

Rules:

- One active draft per mission.
- Duplicate Start does not create a second draft.
- Checkpoint and Debrief reuse the current draft.
- Future external writes still require later approval.
- Bad or overlapping sessions remain blocked from external ledgers.
