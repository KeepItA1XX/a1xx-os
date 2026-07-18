# Build Agent Notion-First Live Data Contract and Schema-Gap Audit

Date: 2026-07-18
Gate: `APPROVE BUILD AGENT NOTION-FIRST LIVE DATA CONTRACT AND SCHEMA-GAP AUDIT ONLY`
Disposition: `audit_complete_reuse_first_no_notion_schema_gap_for_first_thin_read_path`

## Scope and Evidence

This was a read-only inventory of existing Notion schemas, the current Apps Script relay shape, and the current HTML consumer fields. No Notion database, data source, page, record, relation, template, app file, Apps Script file, or data record was written.

Controlling verified sources:

- Projects: `collection://19f61152-81da-8141-86a7-000b43a05c39`
- Tasks: `collection://19f61152-81da-81d1-9b62-000b988f7279`

Current local artifacts inspected:

- HTML: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/money-mission-tracker-v2_5.html`
  - SHA-256: `8a2c7578c6ebbee0fbae8cd98ef06bf8be773efde11c16303764bbbca6ece2d8`
- Apps Script relay: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/apps-script-money-mission-tracker-v2_5.gs`
  - SHA-256: `8496b6c120137fc987ee4239dab05a3dfe10995d0c71ea45e7539ad195452ba8`
- Current repo head: `dd85283 Document Money Mission agentic company strategy`

Notion schema fetches succeeded for Projects, Tasks, the five AI Agency sources, Agent Output Archives, Operational Notes, and the five Project Desk sources. A bounded sample-row SQL query was attempted once but the connected Notion backend returned `Tool notion-query-data-sources not found`; no retry was made. Therefore this audit establishes schema and relay compatibility, not row-level nullability or record counts.

## Source and Field Map

### Projects and Tasks: verified Notion truth

Projects already contains the app-relevant project contract:

- Identity: `Project name`, `Project Type`, `Status`, `Priority`, `Dates`.
- Operating context: `Summary`, `Current Next Move`, `Outcome / Definition of Done`, `Owner`, `Executive Producer`, `Artist`.
- Client context: `Client Email`, `Client Phone`.
- Review and money signals: `Needs A1XX`, `Closest To Money`, `Completion` rollup.
- Relations: `Tasks`, `Tasks (Master)`, `Is Blocking`, `Blocked By`, `Related Assets`, `Campaign`, `Mission Attempt`, `Money Mission Cycle`.

Tasks already contains the app-relevant task contract:

- Identity and state: `Task name`, `Status`, `Priority`, `Due`, `Completed on`.
- Ownership and hierarchy: `Assignee`, `Project`, `Parent-task`, `Sub-tasks`.
- Work context: `Tags`, `Campaign`, `Related Asset`, `Money Mission Cycle`, `Mission Attempt`.
- Execution/readout: `Move Type`, `Notes`, `Result Needed`, `Actual Minutes`, `Estimated Minutes`, `Estimate`, `Energy`, `Work Blocks`, `Batch Lane`, `Area`, `Rule of 300 Eligible`, `Result Logged`, `App Read Eligible`.

Classification: these fields are **existing Notion truth**. No Projects or Tasks schema gap is established.

### Agents: verified existing sources

The relay-named AI Agency sources have sufficient source truth for the current Agents graph:

- Departments: `Department Name`, `Status`, `Purpose`, `Build Priority`, `Order`, `Color`, `Hex Code`, `Captains`, `Jobs`.
- Captains: `Captain Name`, `Department`, `Status`, `Purpose`, `Instructions`, `Jobs Managed`, `A1XX Approval Required`, `Build Priority`, `Last Active`, `Model`, `Tool Access`.
- Jobs: `Job Name`, `Status`, `Department`, `Captain`, `Goal`, `Job Description`, `Job Type`, `Role`, `Skills`, `Active Tasks`, `Recent Outputs`, `Verification Method`, `Verification Type`, `Build Priority`, `Order`.
- Skills: `Skill Name`, `Status`, `Description`, `Job`, `Workers`, `Verification Method`, `Verification Type`, `Build Priority`, `Execution Order`.
- Workers: `Worker Name`, `Status`, `Description`, `Worker Type`, `Skill`, `Source System`, `Canonical Record ID`, `Code Location`, `Input Schema`, `Output Schema`, `Integration Needed`, `Intel Read Eligible`, `Trust Score`, `Execution Count`, `Success Count`, `Failure Count`, `Last Reviewed`, `Execution Identity`, `Linear Team ID`, `Build Priority`.

Classification: source fields are **existing Notion truth**; graph membership, unassigned routing, counts, and display hierarchy are **relay-computed state** and **app-local presentation state**.

### Outputs, Memory, and Project Desk

Existing source truth is also present for the current secondary surfaces:

- Agent Output Archives: `Output Name`, `Summary`, `Status`, `Output Type`, `Output Date`, `Next Action`, `Player Safe Summary`, `Mission Command Brief Line`, `App Surface`, `App Read Eligible`, `Approval Needed`, `Output Approval State`, `Revision State`, `Handoff State`, `Parked State`, `Show In Review Queue`, source/runbook links, and relations to Agent, Department, Captain, Job, Skill, Worker, Cycle, Campaign, Feedback, and Command.
- Operational Notes: `Note Title`, `Note Summary`, `Note Body`, `Note Type`, `Note Status`, `Priority`, `Action Needed`, `Next Action`, `App Read Eligible`, `Source / Origin`, `Source Agent`, `Source URL`, and related context links.
- Project Tasks (Master): `Name`, `Status`, `Due date`, `Assignee`, `Project`, `Move Type`, `Notes`, `Result Needed`, `Priority`, `App Read Eligible`, and work-estimate fields.
- Project Outputs: `Output Name`, `Summary`, `Status`, `Output Type`, `Project`, `Source URL`, `App Read Eligible`, `Needs A1XX Review`.
- Project Timeline: `Timeline Item`, `Summary`, `Status`, `Milestone`, `Project`, `Source URL`, `App Read Eligible`, `Needs A1XX Review`.
- Project Notes: `Note Title`, `Note Body`, `Note Type`, `Status`, `Project`, `Source URL`, `App Read Eligible`, `Needs A1XX Review`.
- Project Activity: `Activity`, `Activity Type`, `Summary`, `Status`, `Project`, `Source URL`, `App Read Eligible`.

Classification: these are **existing Notion truth**. Output status lanes, review chips, fit scores, routes, compact rows, drawers, and selected-item state are **relay-computed state** or **app-local presentation state**, not schema gaps.

## Current Relay Contract

### Intel packet

`getIntelReadPacketV1` is exposed by `doGet` as `action=intel_read_packet_v1` and reads the five AI Agency sources plus Agent Output Archives and Operational Notes. `normalizeIntelAgencyRowV1` currently projects each row to:

`id`, `title`, `status`, `kind`, `summary`, `owner`, `department`, `captain`, `job`, `skill`, `worker`, `tools`, `model`, `approvalRequired`, `source`, `sourceUrl`, and `updatedAt`.

The relay then computes duplicate IDs, missing relation IDs, graph counts, Linear linkage, and Today arrays: `brief`, `queues`, `approvals`, `risks`, and `recent`. It does not currently project every source field listed above, including output `Next Action`, `Player Safe Summary`, `App Read Eligible`, `Output Approval State`, or the full verification and trust fields.

### Existing project read packet

`getLiveReadPacketV1` is a separate read-only endpoint. `normalizeLiveProjectV1` projects Projects to:

`id`, `objectType`, `title`, `artist`, `clientEmail`, `clientPhone`, `projectType`, `status`, `priority`, `summary`, `nextAction`, `needsA1XX`, `closestToMoney`, `url`, `source`, and `updatedAt`.

It also reads the existing Project Tasks (Master), Project Outputs, Project Timeline, Project Notes, and Project Activity sources. Project Desk rows are normalized to `id`, `projectId`, `title`, `summary`, `status`, `sourceUrl`, `updatedAt`, plus kind-specific `type`, `needsA1XXReview`, `milestone`, `priority`, and `nextAction`.

The current project relay does not yet project Projects `Dates`, `Owner`, `Executive Producer`, `Outcome / Definition of Done`, `Completion`, `Tasks`, `Blocked By`, or `Is Blocking` into the normalized packet. This is a **relay projection gap against existing Notion truth**, not a Notion schema gap.

### HTML consumer contract

The HTML stores the configured relay URL under `a1xx_sheets_url_v1`, calls `action=intel_read_packet_v1` through `getIntelReadPacketJsonpV25`, and binds the response to `INTEL_LIVE_PACKET_V25` and `window.INTEL_CONTEXT_V1`.

The live adapter normalizes records to common display fields: `id`, `title`, `status`, `summary`, `type`, `kind`, `agent`, `sourceSystem`, `sourceDatabase`, `sourceUrl`, and `updatedAt`. `rebuildIntelAgencyRegistryFromLivePacketV25` then creates the department/job/skill/worker/output hierarchy, adds `Unassigned / Operations Review` when relations are not verified, and preserves local presentation state separately.

## View-by-View Classification

| View | Existing source truth | Relay-computed state | App-local presentation state | Schema-gap result |
| --- | --- | --- | --- | --- |
| Today | Projects, Tasks, Project Timeline/Activity/Outputs, Agent Outputs, Operational Notes | `today.brief`, `queues`, `approvals`, `risks`, `recent`; project/task joins; freshness and health | Open First, compact timeline, needs/ready/waiting lanes, drawers, counts, tone, selected item | No Notion schema gap; thin project/task projection is missing for richer live Today semantics |
| Projects | Projects title/status/type/priority/summary/next move/client fields; Tasks and Project Desk relations | project-to-task/output/timeline joins; source discovery; status/freshness | Project cards, routes, selected project, files/notes/activity layout | No Notion schema gap; Dates/Owner/Completion/blocking relations are not in current normalized packet |
| Agents | Departments/Captains/Jobs/Skills/Workers schemas and relations | graph registry, relation resolution, unassigned bucket, counts, Linear linkage | tabs, filters, node path, selected agent/job/skill/worker, local run notes | No Notion schema gap; several trust/verification fields remain unprojected |
| Outputs | Agent Output Archives and Project Outputs include names, summaries, statuses, review, next-action, source, and relations | output dedupe, parent-job/department mapping, status grouping | queue, filters, preview, checklist/next-click rows, protected local action state | No Notion schema gap; current generic normalizer omits useful output-specific fields |
| Library | Agent Outputs, Operational Notes, project files/outputs/notes provide source/title/status/summary/link fields | source aggregation and record normalization | type chips, route, fit score, color, table/board/drawer, related labels | No Notion schema gap; `route`, `fit`, `useCase`, and compact display fields are app-local/computed |
| Planning | Tasks `Status`, `Due`, `Priority`, `Project`, `Assignee`, `Result Needed`, plus Projects `Current Next Move`, `Needs A1XX`, `Blocked By` | queues, approvals, risks, next-action summaries, project/task joins | Planning lane, focus choice, parked work, approval/readback copy | No schema gap established; current direct live Planning projection is incomplete |
| Mission Command | Projects `Current Next Move`, Tasks `Result Needed`/`Status`, Output `Mission Command Brief Line`/`Player Safe Summary`, Notes `Next Action` | safe context assembly and read-only summaries | local mission chain, focus lane, context packet, answer formatting, voice/action guards | No schema gap established; current Mission Command path is primarily local context and does not consume the Intel packet directly |

## Gap Classification

1. **Existing Notion truth:** Projects, Tasks, AI Agency, Outputs, Notes, and Project Desk schemas already contain the needed business fields and relations.
2. **Relay projection gaps:** the current normalized project packet omits several existing project fields; the Intel generic normalizer omits source-specific output, verification, trust, and app-read fields.
3. **Relay-computed state:** freshness, health, duplicate/missing-relation diagnostics, Today queues, graph hierarchy, project joins, unassigned routing, and status grouping.
4. **App-local presentation state:** filters, tabs, selected records, drawers, fit scores, display routes, compact rows, previews, local staging, and Mission Command focus/context formatting.
5. **Genuine Notion schema gaps:** none established for the first thin read path. A genuine gap must not be declared until a required field is absent from both verified source schemas and all relevant existing source collections.

## Recommended First Thin Read-Path Candidate

Prepare, as a separately approved relay-only contract, one stable read projection using the existing Projects and Tasks truth:

```text
notion_first_project_task_read_v1
projects[]:
  id, title, projectType, status, priority, dates, owner, summary,
  nextAction, outcome, needsA1XX, closestToMoney, completion,
  blockedByIds, isBlockingIds, taskIds
tasks[]:
  id, title, status, due, completedOn, priority, assigneeIds,
  projectId, parentTaskIds, subTaskIds, tags, notes, resultNeeded,
  appReadEligible, updatedAt
```

This candidate reuses existing Notion fields, requires no Notion schema or record write, and is the smallest useful bridge for Today, Projects, Planning, and Mission Command. It is a future packet candidate only; it was not implemented, invoked, or deployed in this audit.

The next later candidate after that should be a source-specific Output/Agent projection that preserves `Next Action`, `Player Safe Summary`, `Output Approval State`, `Revision State`, `Handoff State`, `App Read Eligible`, verification/trust fields, and source relations without dropping the generic fields used by the current Agents/Outputs/Library UI.

## Research Needed

- Obtain a supported bounded row-read mechanism for Projects and Tasks to validate actual nullability, relation cardinality, archived-row policy, and live record counts. The one SQL tool attempt failed because the backend did not expose the named tool; no retry was made.
- Confirm whether `Tasks` and `Tasks (Master)` are intentionally parallel source contracts and which one is authoritative for each view.
- Confirm whether the `Completion` rollup is stable for the read packet and how empty or blocked projects should be represented.
- Lock cache/freshness policy for the candidate projection. The current Apps Script data-source helper caches successful reads for up to 600 seconds and retries a 500 response once; this is relevant to freshness evidence and must be preserved or separately approved.
- Decide whether Mission Command may consume the future read packet directly or must remain behind its current local context compiler.

## Exact Stop Conditions

Stop immediately if any of the following occurs:

- A Notion schema, record, relation, template, page, view, cache, or source write is requested.
- A source ID, property name, relation direction, or read authority is ambiguous or mismatched.
- A field needed for the candidate cannot be traced to an existing source property or an explicitly named relay computation.
- The proposed read expands beyond the verified Projects/Tasks plus already relay-named sources.
- A live read requires app, Apps Script, browser, server, sync, deploy, beta, commit, push, or external/live execution before a separate gate.
- The candidate needs more than one new relay projection or combines the project/task and output/agent contracts in one pass.
- Any source-specific field would be silently dropped, renamed without a compatibility rule, or falsely classified as a Notion schema gap.

## Return Route and Exclusions

Return this audit to Planning thread `019f5cb2-80b2-7081-8900-13900ba8e3c4`. The smallest next gate is a docs-only contract packet for `notion_first_project_task_read_v1`; no implementation or schema-release gate is implied.

No Notion schema/record/relation/template write, app or Apps Script edit, browser/server/QA run, sync/deploy, beta enablement, commit/push, unrelated zoom work, or external/live action was performed.
