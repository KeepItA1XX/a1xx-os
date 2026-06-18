# Phase 93 Pass 1A: Phase Scope + Backup

Phase 93 prepares Timer Runtime Cards as the sixth compact read-only player surface.

- Surface: Account > Mission > Missions > Active
- Packet: `timer_runtime_summary`
- Row cap: 4
- UI policy: reuse the existing Mission Active player surface
- Boundary: no app writes, time ledger writes, timer ledger writes, mission completion writes, XP awards, notifications, workers, automations, restore execution, token export, or secret export

Backup created before editing:

- `/Users/a1xxoffice/Documents/Codex/_local_backups/money-mission-os/money-mission-tracker-v2_5_backup_2026-06-18_phase93_timer_runtime_cards_surface_readiness.html`
