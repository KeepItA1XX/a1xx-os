# Phase 87 Source Eligibility Gate

Current Phase: Phase 87: First Live Player Data Surfaces
Current Pass: Pass 1B: Source Eligibility Gate
Pass Type: source eligibility / read-only packet gate

## Gate

Only the `today_money_moves` packet can feed the first live player surface.

## Rules

- The packet is read-only.
- The source name stays hidden from player UI.
- Rows are bounded to 3.
- Source freshness can show player-safe fallback copy.
- No source can write back to Notion, Sheets, Drive, mission ledgers, XP, rewards, or notifications.

