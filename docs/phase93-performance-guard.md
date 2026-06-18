# Phase 93 Pass 1H: Performance Guard

Timer Runtime Cards must stay lightweight.

- Build one compact packet
- Render one existing surface
- Cap rows at four
- Avoid broad Account rebuilds
- Avoid rendering inactive Mission rooms
- Keep Fast QA on compact receipts only

The surface reads existing local timer context and does not trigger app writes or external reads.
