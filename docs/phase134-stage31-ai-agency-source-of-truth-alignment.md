# Phase 134 Stage 31 - AI Agency Source-of-Truth Alignment

Current Phase: Phase 134: Intel / AI Agency Operating Dashboard
Current Stage: Stage 31: AI Agency Source-of-Truth Alignment
Current Passes: Pass 31A through Pass 31E
Pass Type: planning / spec alignment / no app behavior change

## Stage Summary

Stage 31 locks the latest AI Agency source of truth before any Stage 32 code migration.

This stage confirms the official department, job, skill, and worker hierarchy, applies A1XX-approved naming corrections, maps the gap between the current Intel V2 model and the new official AI Agency model, and defines the next implementation stage.

No app runtime, player UI, Notion live read, write path, worker execution, Mission Command behavior, Account surface, or day-card behavior is changed in Stage 31.

## Pass 31A - Source Review

Active source-of-truth docs:

- Money Mission OS - AI Agency Edition UI/UX Spec v3.0
- AI Agency Department System - 8 Departments, 40 Jobs (Official Source of Truth) v4.0
- Money Mission OS - Department Captain Agent Design System
- Notion Build Spec - 14 Databases for AI Agency System

Source priority:

1. AI Agency Department System v4.0 owns the official department and job roster.
2. AI Agency UI/UX Spec v3.0 owns the Agents, Library, Today structure.
3. Department Captain Agent Design System owns visual identity rules for future captain and skill icons.
4. 14-Database Notion Build Spec owns future database architecture only.

Older seven-agent and prototype Intel specs are reference only. They do not override the v4 department/job roster.

## Pass 31B - Roster Corrections

A1XX-approved naming corrections:

- Memory Keeper becomes Context Manager.
- Video Editor becomes Video Producer.
- Automation Builder becomes Systems Engineer.

The official count remains:

- 8 departments
- 40 jobs
- Captain -> Job -> Skill -> Worker hierarchy

## Corrected 8 Departments

| Department | Color | Hex |
| --- | --- | --- |
| Leadership | Silver / White | #E5E7EB |
| Content | Purple | #A855F7 |
| Sales | Cyan | #06B6D4 |
| Advertising | Orange | #F97316 |
| Networking | Pink | #EC4899 |
| Production | Gold | #FCD34D |
| Fulfillment | Royal Blue | #3B82F6 |
| Operations | Teal | #14B8A6 |

## Corrected 40 Jobs + Starting Skills

### Leadership

1. Chief of Staff
   - Coordinate Departments
   - Manage Priorities
   - Identify Bottlenecks
   - Route Work Across the AI Agency
2. Executive Assistant
   - Send Reminders
   - Track Tasks
   - Prep Meetings
   - Manage Follow-ups
   - Support Leadership
3. Quality Control
   - Verify Quality
   - Enforce Consistency
   - Detect Errors Before Delivery
4. Context Manager
   - Manage Context
   - Track Decisions
   - Recall Project History

### Content

5. Creative Director
   - Pull Weekly Angles
   - Ground Content in Reality
   - Feed Content Planner
6. Content Planner
   - Schedule Publishing
   - Plan Campaigns
   - Organize Content
7. Content Creator
   - Write Hooks
   - Write Scripts
   - Write Captions
   - Write Descriptions
   - Write CTAs
   - Adapt for Platforms
8. Video Producer
   - Edit Reels
   - Add Captions and Effects
   - Package for Post-Production
9. Thumbnail Designer
   - Design Cover Graphics
   - Design Social Graphics
   - Package Visuals

### Sales

10. Lead Researcher
    - Find Producers
    - Find Collaborators
    - Find Studios
    - Find Strategic Opportunities
11. Sales Specialist
    - Qualify Leads
    - Develop Opportunities
    - Start Conversations
    - Advance Conversations
12. Follow-Up Agent
    - Nurture Opportunities
    - Revive Stalled Conversations
    - Move Pipeline Forward
13. Call Booker
    - Send Confirmations
    - Handle Booking Logistics
    - Coordinate Calendar Links
14. CRM Manager
    - Track Contact Records
    - Maintain Sales Data
    - Log Opportunity Movement

### Advertising

15. Media Buyer
    - Manage Budget
    - Set Targeting
    - Scale Winning Campaigns
16. Ad Copywriter
    - Write Offers
    - Write Ad Copy
    - Write Message Variations
17. Ad Creative Designer
    - Design Ad Videos
    - Create Static Creatives
    - Build Creative Testing Assets
18. Performance Analyst
    - Report Performance
    - Recommend Optimizations
    - Identify Winning Campaigns

### Networking

19. Event Finder
    - Find Showcases
    - Find Networking Opportunities
    - Find Places A1XX Should Be Present
20. Event Coordinator
    - Handle Event Logistics
    - Build Attendance Strategy
    - Prepare A1XX Before Events
21. RSVP Manager
    - Manage Attendee and Contact Lists
    - Maintain Who A1XX Plans to Meet
22. Event Follow-Up Agent
    - Maintain Relationships
    - Transfer Qualified Contacts into Sales

### Production

23. Asset Preparation Manager
    - Create Export Versions
    - Package Assets for Distribution
    - Prepare Soundee Packages
    - Prepare YouTube Packages
    - Prepare BANGIN+ Packages
    - Prepare Production Deal Packages
24. Asset Catalog Manager
    - Track Licensing
    - Track Usage
    - Track Availability
    - Maintain Asset Database
25. Production Manager
    - Track Milestones
    - Track Deadlines
    - Coordinate Tasks
    - Report Production Status
26. Creative Control
    - Review Creative Work
    - Maintain Brand Alignment
    - Give Creative Feedback
    - Identify Strongest Assets
27. Session Planner
    - Schedule Shoots
    - Manage Production Calendars
    - Coordinate Logistics

### Fulfillment

28. Onboarding Manager
    - Run Welcome Process
    - Gather Information
    - Manage Onboarding Forms
29. Project Manager
    - Manage Client Timelines
    - Coordinate Fulfillment
    - Track Milestones
30. Funnel Builder
    - Build Landing Pages
    - Build Sales Funnels
    - Set Up Automations
    - Set Up Funnels
31. Media Producer
    - Coordinate Cover Art
    - Coordinate Music Videos
    - Coordinate Lyric Videos
    - Coordinate Promo Assets
32. Delivery Manager
    - Hand Off Client Assets
    - Organize Delivery
    - Manage Client Files
33. Retention Manager
    - Run Check-ins
    - Drive Upsells
    - Generate Referrals
    - Grow Relationships
34. Offboarding Manager
    - Collect Testimonials
    - Close Projects
    - Set Up Referrals
    - Manage Archive

### Operations

35. Finance Manager
    - Track Revenue
    - Track Expenses
    - Monitor Profitability
    - Report Financials
36. Contract Manager
    - Create Contracts
    - Track Signatures
    - Manage Agreements
    - Manage Contract Lifecycle
37. Data Analyst
    - Analyze KPIs
    - Detect Bottlenecks
    - Analyze Trends
    - Recommend System Improvements
38. Systems Engineer
    - Design Workflows
    - Develop Automations
    - Optimize Processes
    - Route Operations
39. Developer
    - Fix Bugs
    - Maintain Applications
    - Develop Applications
40. Integration Manager
    - Manage Platform Integrations
    - Maintain Integrations
    - Troubleshoot Connections

## Pass 31C - Current App Gap Map

Current production app file:

- `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/money-mission-tracker-v2_5.html`

Current Intel scaffolding that should be preserved:

- Galaxy Brain sphere
- department focus behavior
- workspace below the sphere
- output drilldown
- breadcrumbs / return flow
- Executive Brain core workspace
- protected boundary and compact Fast QA rows

Current local model labels that must migrate in Stage 32:

- Research
- Outreach
- Scheduler
- Memory
- Developer as a department
- Chief of Staff as a department
- Sub-Agent language where it should now say Job

Stage 32 should replace the local model feeding the sphere. It should not rebuild the Intel system from scratch.

## Pass 31D - Stage 32 Build Map

Next implementation stage:

Phase 134: Intel / AI Agency Operating Dashboard
Stage 32: Intel Local Model Migration

Stage 32 pass plan:

- Pass 32A: Official Department + Job Registry
- Pass 32B: Sphere Node Mapping
- Pass 32C: Workspace Language Migration
- Pass 32D: Agents Tab Drilldown Prep
- Pass 32E: QA + Closeout Receipt

Stage 32 implementation defaults:

- Use local/static data from the corrected v4 roster first.
- Keep the main visible tab label as Agents.
- Inside Agents, use Departments, Jobs, Skills, and Workers.
- The Galaxy Brain sphere shows 8 department clusters and 40 job nodes.
- Captain identity is represented at the department center.
- Skills and workers appear in drilldowns only.

Stage 32 boundaries:

- No live Notion reads.
- No app writes.
- No mission completion.
- No XP or reward execution.
- No notification dispatch.
- No worker execution.
- No automation activation.
- No Mission Command changes.
- No Account tab changes.
- No day-card replacement.

## Pass 31E - Acceptance Criteria

Stage 31 is complete when this doc exists and can be used as the handoff for Stage 32.

Stage 32 can begin only after A1XX approves a code implementation plan using:

- corrected 8-department roster
- corrected 40-job roster
- local/static migration first
- clear UI language rules
- clear protected-action boundaries
- Stage 32 pass list

## UI Language Rules

- Main visible tab can say Agents.
- Inside Agents, use the real hierarchy:
  - Departments
  - Jobs
  - Skills
  - Workers
- The phrase Sub-Agent should be migrated away from player-facing Intel UI when referring to the 40 official jobs.
- Skills and Workers are deeper drilldown concepts and should not crowd the primary sphere.

## Notes For Future Build

- Department captain design belongs to future visual/icon polish.
- Captain face shape, color ring, hats, and props should not block Stage 32.
- The 14-database Notion architecture is not assumed live until verified.
- Local/static roster migration is the safest next move because it makes the app match the source of truth without waiting on Notion database readiness.
