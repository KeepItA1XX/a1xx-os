# Integration Agent Notion-First Project-Task Read V1 Projects-Only Corrected Row-Read Proof Closeout

Date: 2026-07-18
Gate: `APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 PROJECTS-ONLY CORRECTED QUERY-DATA-SOURCES ROW-READ PROOF EXACTLY ONCE`
Authority disposition: `consumed_preflight_blocked_no_row_query`
Planning thread: `019f5cb2-80b2-7081-8900-13900ba8e3c4`

## Result

Stopped fail-closed during schema-only preflight before the row-read query.

The corrected packet's exact SQL includes `Completion`, but the live Projects schema-only preflight returned `notAvailableInQuerySql:["Sign off project?","Completion"]`. Because `Completion` is not queryable in SQL for this data source, the packet SQL and schema contract drifted. The single SQL-mode row query was not executed.

## Verified Controlling Evidence

- Corrected packet: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/PACKET_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_EXACT_ROW_READ_PROOF_DECISION_CORRECTED_2026-07-18.md`
- Corrected packet SHA-256: `7f7bfb51d86f468fcb06eb23587091615b4cbab7dbfb7735d4b4ed8435496ad9`
- Schema audit: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_BUILD_AGENT_NOTION_FIRST_LIVE_DATA_CONTRACT_SCHEMA_GAP_AUDIT_2026-07-18.md`
- Schema audit SHA-256: `387b8011e97b7f76171d45cb306b4ca9c14ab0b611d68d2d2b19e95f1345c4f0`
- Capability closeout: `/Users/a1xxoffice/Documents/Codex/_prototype_work/money-mission-os/notion-first-project-task-read-v1-query-capability-surface-integration-closeout-2026-07-18.md`
- Capability closeout SHA-256: `8e37af81e9cc3f99f009cdc86e03be66896c03d0549dc3e7d55f4328f7c51121`
- Project-Task V1 packet: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/PACKET_BUILD_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_PROJECTION_DECISION_2026-07-18.md`
- Project-Task V1 packet SHA-256: `7ecc2f60b1923f201dfd272cd5489ee6d4ecc955fdaf3707cbb3c328e88d390c`

## Schema-Only Preflight Evidence

- Tool invoked for schema-only preflight: `mcp__codex_apps__notion._fetch`
- Preflight target: `collection://19f61152-81da-8141-86a7-000b43a05c39`
- Data-source title returned: `Projects`
- Data-source URL returned: `collection://19f61152-81da-8141-86a7-000b43a05c39`
- SQLite table returned: `collection://19f61152-81da-8141-86a7-000b43a05c39`
- `notAvailableInQuerySql`: `Sign off project?`, `Completion`
- Confirmed queryable selected columns present in SQLite table: `Project name`, `Project Type`, `Status`, `Priority`, `Current Next Move`, `Outcome / Definition of Done`, `Needs A1XX`, `Closest To Money`
- Blocking selected column: `Completion`
- Metadata identifiers: `url` and `createdTime` are present in SQLite definition, but the corrected packet did not authorize changing the SQL to use them.

## Query Execution Receipt

```text
{
  packet: "notion_first_project_task_read_v1_projects_only_corrected_row_read_proof",
  status: "blocked",
  blocker: "corrected_packet_sql_includes_completion_but_schema_marks_completion_not_available_in_query_sql",
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
    "Closest To Money",
    "Completion"
  ],
  rowLimit: 5,
  rowsReturned: 0,
  rowQueryExecuted: false,
  schemaPreflightCalls: 1,
  sqlRowQueryCalls: 0,
  hasMore: null,
  nextCursorPresent: null,
  pageIdMetadataPresent: null,
  sourceUrlMetadataPresent: null,
  lastEditedMetadataPresent: null,
  sourceFetchedAt: null,
  generatedAt: "2026-07-18T12:13:18-04:00",
  freshnessState: "blocked",
  errors: [
    "Completion is listed in notAvailableInQuerySql for the Projects data source."
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
- SQL row queries executed: `0`.
- Rows returned: `0`.
- Follow-up queries: `0`.
- Tasks or Tasks (Master) queries: `0`.
- Search/view/direct API/browser/app relay/cache paths used: `0`.
- Notion writes: `0`.
- Source/app/Apps Script/HTML edits: `0`.
- Sync/deploy/beta/commit/push/external actions: `0`.

## Command Hub Receipt

- Receipt file: `/Users/a1xxoffice/A1XX WIKI/06 Command Hub/Local Update Log.md`
- Backup before receipt: `/Users/a1xxoffice/A1XX WIKI/06 Command Hub/Local Update Log_backup_2026-07-18_121318_projects-only-row-read-proof-blocked.md`
- Backup SHA-256: `47ae2e5a3f98f38ef22da592dfaf5a8acc77292a29f61860a2ff4fae161e0207`

## Blockers

The future row-read proof cannot execute using the corrected packet's exact SQL because `Completion` is not available in SQL for the Projects data source.

## Smallest Next Bounded Gate

`APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 PROJECTS-ONLY COMPLETION-EXCLUDED QUERY-DATA-SOURCES ROW-READ PROOF PACKET CORRECTION ONLY`

That gate should be docs-only and should remove `Completion` from the SQL-selected columns while preserving it as a deferred rollup/readability limitation. It should not execute the row query.
