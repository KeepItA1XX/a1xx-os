# Integration Agent Notion-First Project-Task Read V1 Projects-Only Completion-Excluded Row-Read Proof Closeout

Date: 2026-07-18
Gate: `APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 PROJECTS-ONLY COMPLETION-EXCLUDED QUERY-DATA-SOURCES ROW-READ PROOF EXACTLY ONCE`
Authority disposition: `consumed_sql_dispatch_blocked_no_rows`
Planning thread: `019f5cb2-80b2-7081-8900-13900ba8e3c4`

## Result

The packet and correction closeout SHAs matched. Schema-first Projects preflight passed for the Completion-excluded eight-column contract. The single authorized SQL-mode Projects row query was then attempted exactly once using the packet's exact SQL and `LIMIT 5`.

The row query did not return rows because connector dispatch failed with:

`MCP error -32602: Tool notion-query-data-sources not found`

No retry, fallback, alternate path, follow-up query, write, app/source edit, sync/deploy, beta, commit/push, or external action occurred.

## Verified Controlling Evidence

- Completion-excluded packet: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/PACKET_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_COMPLETION_EXCLUDED_ROW_READ_PROOF_DECISION_2026-07-18.md`
- Completion-excluded packet SHA-256: `44ea70e01a41b950898663514eaca615bd149a1d061d1d058065355f6145d402`
- Correction closeout: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_COMPLETION_EXCLUDED_PACKET_CORRECTION_2026-07-18.md`
- Correction closeout SHA-256: `e64d279b586781f5e3b0e7bc8b6c670b00a5245b753ab99db41b6c1f65fcd27c`

## Schema-First Preflight Evidence

- Tool invoked for schema-only preflight: `mcp__codex_apps__notion._fetch`
- Preflight target: `collection://19f61152-81da-8141-86a7-000b43a05c39`
- Data-source title returned: `Projects`
- Data-source URL returned: `collection://19f61152-81da-8141-86a7-000b43a05c39`
- SQLite table returned: `collection://19f61152-81da-8141-86a7-000b43a05c39`
- Confirmed selected columns present: `Project name`, `Project Type`, `Status`, `Priority`, `Current Next Move`, `Outcome / Definition of Done`, `Needs A1XX`, `Closest To Money`
- Confirmed deferred unavailable field: `Completion`
- Confirmed excluded sensitive/relation fields not selected: `Client Email`, `Client Phone`, `Summary`, `Owner`, `Executive Producer`, `Artist`, `Tasks`, `Tasks (Master)`, `Is Blocking`, `Blocked By`, `Related Assets`, `Campaign`, `Mission Attempt`, `Money Mission Cycle`

## Exact SQL Attempted Once

```text
SELECT "Project name", "Project Type", Status, Priority, "Current Next Move", "Outcome / Definition of Done", "Needs A1XX", "Closest To Money" FROM "collection://19f61152-81da-8141-86a7-000b43a05c39" LIMIT 5
```

Params: `[]`

## Safe Result Receipt

```text
{
  packet: "notion_first_project_task_read_v1_projects_only_completion_excluded_row_read_proof",
  status: "blocked",
  blocker: "mcp_dispatch_tool_not_found",
  dispatchError: "MCP error -32602: Tool notion-query-data-sources not found",
  toolRegistration: "mcp__codex_apps__notion_notion_query_data_sources",
  mode: "sql",
  source: "collection://19f61152-81da-8141-86a7-000b43a05c39",
  selectedColumns: [
    "Project name",
    "Project Type",
    "Status",
    "Priority",
    "Current Next Move",
    "Outcome / Definition of Done",
    "Needs A1XX",
    "Closest To Money"
  ],
  deferredUnavailableFields: [
    {
      "field": "Completion",
      "reason": "not_available_in_query_sql",
      "relayValue": null
    }
  ],
  rowLimit: 5,
  rowsReturned: 0,
  rowValuesEmitted: false,
  schemaPreflightCalls: 1,
  sqlRowQueryCalls: 1,
  followUpQueries: 0,
  hasMore: null,
  nextCursorPresent: null,
  sourceFetchedAt: null,
  generatedAt: "2026-07-18T12:18:25-04:00",
  freshnessState: "blocked",
  nullabilityObserved: false,
  sensitiveValuesEmitted: false,
  relationExpansionsEmitted: false,
  errors: [
    "MCP error -32602: Tool notion-query-data-sources not found"
  ],
  blocked: {
    notionWrite: false,
    fallbackRecords: false,
    alternateTool: false,
    appWrite: false
  }
}
```

## Boundary Verification

- Schema-only preflight calls: `1`.
- SQL row-query attempts: `1`.
- SQL row-query successes: `0`.
- Rows returned: `0`.
- Row values emitted: `false`.
- Nullability observed: `false`.
- Pagination metadata observed: `false`.
- Follow-up queries: `0`.
- Tasks or Tasks (Master) queries: `0`.
- Search/view/direct API/browser/app relay/cache paths used: `0`.
- Notion writes: `0`.
- Source/app/Apps Script/HTML edits: `0`.
- Retry/fallback/repair attempts: `0`.
- Sync/deploy/beta/commit/push/external actions: `0`.

## Command Hub Receipt

- Receipt file: `/Users/a1xxoffice/A1XX WIKI/06 Command Hub/Local Update Log.md`
- Backup before receipt: `/Users/a1xxoffice/A1XX WIKI/06 Command Hub/Local Update Log_backup_2026-07-18_121825_completion-excluded-row-read-proof.md`
- Backup SHA-256: `5014537656beee2f6dba9f4e3087256fd42950e1f6198f8750360f9a750371c7`

## Blocker

The Notion SQL row-query surface remains not dispatchable in this runtime despite schema fetch working. The stable tool name surfaced in schema/inventory is not currently executable as `notion-query-data-sources`.

## Smallest Next Bounded Gate

`APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 QUERY-DATA-SOURCES DISPATCH AVAILABILITY RECONCILIATION ONLY`

That gate should be docs/read-only and should reconcile why the registered Notion query surface is visible to the agent but dispatches to a missing backend tool name. It should not issue another row query, use alternate Notion paths, or modify connector/source/app state.
