# Money Mission OS — Decision and Approval Rights v1

## Authority levels

| Level | Meaning | Examples |
|---|---|---|
| L0 | Read-only | Read authorized records; detect changes; report state |
| L1 | Draft | Prepare briefs, messages, plans, schedules, and outputs without sending |
| L2 | Stage | Create local/staged work, proposed task records, draft files, and approval packets |
| L3 | Approved execution | Perform an explicitly approved bounded action once, with receipt |
| L4 | Executive-only | Strategic direction, brand decisions, money movement, irreversible or external commitments |

## Default rights

- Chief of Staff: L0–L2 by default; L3 only for explicitly approved internal routing.
- Executive Assistant: L0–L2 by default; L3 only for explicitly approved internal reminders or scheduling changes.
- Domain agents: L0–L2 by default; L3 only through a workflow-specific approval gate.
- A1XX: all levels, with irreversible actions requiring explicit confirmation and receipt.

## Always requires A1XX approval

- External send, publish, or delivery
- Money movement, pricing, discounts, refunds, or contracts
- Brand or public positioning changes
- New permissions, API credentials, or role identities
- Destructive edits, deletes, archives, or irreversible migrations
- Strategic priority changes or pivots
- Personal-context exposure beyond decision-relevant fields
- Any action with conflicting sources or unknown destination

## Approval packet minimum

Every approval request includes: proposed action, source records, owner, destination, evidence, confidence, risk, downstream effects, reversibility, expiry, and the exact action to approve.
