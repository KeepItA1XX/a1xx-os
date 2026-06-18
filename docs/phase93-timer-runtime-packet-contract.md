# Phase 93 Pass 1C: Timer Runtime Packet Contract

Timer Runtime Cards use one compact packet shape:

- `packetKey`: `timer_runtime_summary`
- `surfaceKey`: `timer_runtime_cards`
- `rows`: max 4
- required rows: block, lane, today, rule300
- read-only: true
- writes: false

Missing data must show Pending or Not Tracked. No fake time, fake Rule of 300 progress, fake mission completion, fake XP, or fake rewards are allowed.
