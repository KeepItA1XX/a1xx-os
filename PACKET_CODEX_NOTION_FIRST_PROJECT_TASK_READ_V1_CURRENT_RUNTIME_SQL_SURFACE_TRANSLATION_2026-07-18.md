# Codex Current-Runtime Notion-First Project-Task Read V1 SQL Surface Translation

Date: 2026-07-18
Status: `prepared_non_executing`
Disposition: `ready_for_one_projects_only_completion_excluded_sql_read_in_current_codex_runtime`

## Purpose

The Integration runtime advertised `mcp__codex_apps__notion_notion_query_data_sources` but dispatched to an unbound backend slug. The current Codex runtime exposes the same exact model-visible Notion SQL tool registration. This packet translates the already-approved proof to that current runtime only; it does not change the data contract, access scope, or no-write controls.

## Controlling Evidence

- Completion-excluded proof packet: `PACKET_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_COMPLETION_EXCLUDED_ROW_READ_PROOF_DECISION_2026-07-18.md`
- SHA-256: `44ea70e01a41b950898663514eaca615bd149a1d061d1d058065355f6145d402`
- Dispatch blocker closeout: `CLOSEOUT_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_PROJECTS_ONLY_COMPLETION_EXCLUDED_ROW_READ_PROOF_2026-07-18.md`
- SHA-256: `c2ccd1e3813efb8b8e9b4fbeec58ea37ef0e0234721cac73c2f164797041b2d9`
- Registration reconciliation: `CLOSEOUT_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_QUERY_DATA_SOURCES_DISPATCH_AVAILABILITY_RECONCILIATION_2026-07-18.md`
- SHA-256: `94a7060c0c36179270311753743e4d651555cc5d2b332a63bec58b5c633854ed`

## Exact Future Proof

1. Confirm the current runtime exposes `mcp__codex_apps__notion_notion_query_data_sources`.
2. Use exactly one SQL-mode call against only `collection://19f61152-81da-8141-86a7-000b43a05c39`.
3. Use exactly this query, with `params: []`:

```sql
SELECT "Project name", "Project Type", Status, Priority, "Current Next Move", "Outcome / Definition of Done", "Needs A1XX", "Closest To Money" FROM "collection://19f61152-81da-8141-86a7-000b43a05c39" LIMIT 5
```

## Boundaries

- No Tasks, Tasks (Master), views, search, direct API, browser, app relay, cache, or second source.
- No Completion SQL column; it remains `completionSqlAvailable:false` / `not_available_in_query_sql`.
- No pagination follow-up, retry, fallback, or alternate query.
- No Notion write, source or app edit, Apps Script edit, sync, deploy, beta, commit, push, or external mutation.
- Stop on tool registration drift, missing property, dispatch error, more than five rows, sensitive/relation-expanded result content, or pagination metadata requiring another read.

## Safe Result Handling

Record only row count, selected-column presence/nullability, pagination/freshness metadata, and safe aggregate shape. Do not persist or repeat raw sensitive values. A later closeout must state exact tool/runtime, query, row count, and all stop conditions.

## Fresh Closeout Path

`/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_CODEX_NOTION_FIRST_PROJECT_TASK_READ_V1_CURRENT_RUNTIME_PROJECTS_ONLY_ROW_READ_PROOF_2026-07-18.md`
