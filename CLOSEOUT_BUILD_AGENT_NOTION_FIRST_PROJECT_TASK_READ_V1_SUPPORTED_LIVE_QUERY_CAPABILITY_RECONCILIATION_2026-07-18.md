# Notion-First Project-Task Read V1 Supported Live Query Capability Reconciliation

Date: 2026-07-18
Gate: `APPROVE BUILD AGENT NOTION-FIRST PROJECT-TASK READ-V1 SUPPORTED LIVE QUERY CAPABILITY RECONCILIATION ONLY`
Disposition: `blocked_inventory_documented_runtime_unavailable`

## Controlling Packet

- Packet: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/PACKET_BUILD_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_PROJECTION_DECISION_2026-07-18.md`
- Packet SHA-256: `7ecc2f60b1923f201dfd272cd5489ee6d4ecc955fdaf3707cbb3c328e88d390c`
- Locked source URLs remain `collection://19f61152-81da-8141-86a7-000b43a05c39` and `collection://19f61152-81da-81d1-9b62-000b988f7279`.

## Inventory Result

The current Build tool inventory advertises these Notion surfaces:

- `mcp__codex_apps__notion_fetch`: callable schema/entity fetch surface. It was used by the preceding audit to fetch the locked source schemas.
- `mcp__codex_apps__notion_notion_query_data_sources`: documented SQL/view row-query surface, inventory-visible but not dispatchable in the current runtime.
- `mcp__codex_apps__notion_notion_query_database_view`: documented view-query surface, inventory-visible but not selected or invoked because it is an alternate mechanism and requires a view URL not present in the locked packet.
- `mcp__codex_apps__notion_search`: broad search surface, not a bounded source-row query and not acceptable for this packet.

The previously attempted row-query dispatch returned exactly:

`MCP error -32602: Tool notion-query-data-sources not found`

No row query was made in this reconciliation. The failed tool name was not retried. No view query, search, direct API call, browser read, relay call, cache action, or alternate mechanism was used.

## Documented Row-Query Contract

The inventory documentation describes the intended SQL invocation as:

```text
tools.mcp__codex_apps__notion_notion_query_data_sources({
  data: {
    mode: "sql",
    data_source_urls: ["collection://..."],
    query: "SELECT ... FROM \"collection://...\" LIMIT ...",
    params: []
  }
})
```

The documented prerequisites and boundaries are:

1. Fetch the data source first and use its exact `collection://` URL.
2. Query one source at a time for this packet.
3. Use a bounded SQL query and parameterized values where needed.
4. Return bounded rows with source page IDs, property values, relation IDs, and deterministic pagination/error state.
5. Do not mutate schema, records, relations, templates, or views.

The inventory also documents view mode with `view_url`, `page_size`, `is_archived`, and `start_cursor`. That mode is not an approved substitute for the packet's locked collection-query boundary and was not invoked.

## Required Read Receipt Shape

Once a callable row-query surface exists, its result must be adapted to the packet-locked receipt without fallback records:

```text
{
  packet: "notion_first_project_task_read_v1",
  status: "live | empty | blocked",
  generatedAt: string,
  sourceFetchedAt: string | null,
  freshness: {
    state: "fresh | stale | unknown | blocked",
    cacheHit: boolean | null,
    cacheAgeMs: number | null,
    maxAgeMs: number
  },
  projects: [],
  tasks: [],
  health: {
    sourceStatus: "live | empty | blocked",
    projectsCount: number,
    tasksCount: number,
    rejectedRows: number,
    relationWarnings: [],
    errors: []
  },
  blocked: {
    notionWrite: false,
    fallbackRecords: false,
    alternateSource: false,
    appWrite: false
  }
}
```

The current Build surface cannot validate that response shape because the row-query dispatch surface is unavailable. This is a capability-availability blocker, not a source/schema conclusion.

## Availability Classification

- Documentation/inventory: `present`.
- Runtime dispatch in this Build surface: `unavailable`.
- Schema fetch surface: `available` and previously verified.
- Bounded row-read surface for the locked packet: `blocked`.
- Source rows inspected in this reconciliation: `0`.
- Fallback or alternate data mechanism: `0`.

The smallest accurate classification is **documented but runtime-unavailable**. The packet cannot proceed to row-level nullability, cardinality, Tasks-versus-Tasks (Master), Completion, or cache/freshness verification until the exact row-query capability is exposed to the current Build surface.

## Smallest Authorized Handoff

Recipient: Notion connector/integration surface owner, routed through Planning.

Request: expose the documented `mcp__codex_apps__notion_notion_query_data_sources` capability under a stable callable registration for this Build surface, or return an explicit host/tool handoff that provides the same schema-first collection-query contract. The handoff must provide registration proof and the documented invocation/receipt contract only; it must not query rows, write Notion, change source, edit app/Apps Script, or alter deployment state.

Return route: Planning thread `019f5cb2-80b2-7081-8900-13900ba8e3c4`.

## Stop Conditions

Stop without retry or alternate mechanism if:

- The documented tool remains absent from runtime dispatch.
- A different tool, view, search, direct API, browser, relay, or cache path is proposed.
- A row query is attempted before the capability handoff is accepted.
- The handoff changes Notion schema/records/relations/templates, app, Apps Script, deployment, sync, beta, or live state.
- Tool name, arguments, source URL, pagination, or receipt shape differs from the locked packet without a new decision packet.

## Next Gate

`APPROVE BUILD AGENT NOTION-FIRST PROJECT-TASK READ-V1 QUERY-CAPABILITY SURFACE HANDOFF ONLY`

No row read, source edit, Notion write, browser/QA, server run, sync, deploy, beta, commit, push, or external/live action was performed or authorized.
