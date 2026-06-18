# Phase 87 Surface Selection Contract

Current Phase: Phase 87: First Live Player Data Surfaces
Current Pass: Pass 1A: Surface Selection Contract
Pass Type: surface selection / one player surface only

## Contract

Phase 87 selects one narrow player-facing read-only surface: `Account > Mission > Overview > Today`.

## Ready Conditions

- Overview Today is the only live player data surface.
- The selected packet is `today_money_moves`.
- Maximum player rows are capped at 3.
- No broad app reads are enabled.
- Protected write and execution paths remain blocked.

