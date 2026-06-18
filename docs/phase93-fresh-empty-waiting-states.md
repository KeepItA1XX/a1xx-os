# Phase 93 Pass 1F: Fresh / Empty / Waiting States

The surface must remain useful when data is missing:

- Today time: Pending when no time is logged
- Rule of 300: Not Tracked when no real reps exist
- Current block: derived from the existing timer when available
- Lane: falls back to the current mission lane

No placeholder progress should pretend that time or reps were logged.
