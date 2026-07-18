# Codex Current-Runtime Projects-Only Row-Read Proof Closeout

Date: 2026-07-18
Packet: `PACKET_CODEX_NOTION_FIRST_PROJECT_TASK_READ_V1_CURRENT_RUNTIME_SQL_SURFACE_TRANSLATION_2026-07-18.md`
Disposition: `blocked_connector_backend_dispatch_unavailable_across_current_and_integration_runtimes`

## Attempt

The current Codex runtime exposed the model-visible registration `mcp__codex_apps__notion_notion_query_data_sources`. Under the translated one-shot contract, it made exactly one SQL-mode attempt against only:

`collection://19f61152-81da-8141-86a7-000b43a05c39`

with the packet-locked eight-column Projects query and `LIMIT 5`.

## Result

The call failed before Notion returned rows:

`MCP error -32602: Tool notion-query-data-sources not found`

This matches the previously isolated Integration dispatch failure. The error is therefore not specific to the Integration thread; the advertised model-visible query schema has no bound backend handler in the current workspace.

## Safe Receipt

```text
{
  runtime: "current Codex",
  toolRegistration: "mcp__codex_apps__notion_notion_query_data_sources",
  source: "collection://19f61152-81da-8141-86a7-000b43a05c39",
  mode: "sql",
  rowLimit: 5,
  sqlRowQueryAttempts: 1,
  sqlRowQuerySuccesses: 0,
  rowsReturned: 0,
  rowValuesEmitted: false,
  error: "MCP error -32602: Tool notion-query-data-sources not found",
  retries: 0,
  alternatePaths: 0,
  notionWrites: 0,
  sourceOrAppWrites: 0
}
```

## Boundary Verification

- No Tasks, Tasks (Master), views, search, direct API, browser, app relay, cache, or second source.
- No pagination follow-up, fallback, or repair.
- No Notion writes or schema changes.
- No source/App Script/HTML change, sync, deploy, beta, commit, or push.

## Blocker and Next Action

The row-read proof is blocked by Notion connector backend registration, across both Integration and current Codex runtimes. Do not retry or use an alternate data path. The next action requires a connector/platform owner to bind or document the executable backend dispatch for the advertised query tool.
