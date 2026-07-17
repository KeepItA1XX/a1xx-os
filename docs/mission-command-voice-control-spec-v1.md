# Mission Command Voice Control + Voice-to-Voice Spec v1

Status: Future implementation spec / planning-ready, not runtime approval
Date: 2026-07-17
Owner: A1XX / Mission Command lane
Primary product: Money Mission OS

## Purpose

Give Mission Command a hands-free operating mode for short commands, reminders, notes, alerts, app navigation, record lookup, and briefings. Voice should feel like an Executive Assistant with continuity and initiative while remaining visibly controlled, interruptible, and approval-gated.

This spec covers the voice experience and the control contract. It does not authorize production HTML edits, Apps Script changes, provider credentials, realtime API sessions, external writes, notifications, reminders, workers, or automations.

## Product promise

Mission Command should let A1XX say what they want in natural language and receive the smallest useful response. It should understand the current app surface and selected record, route safe navigation directly, ask before consequential actions, and preserve useful outcomes in the correct record layer.

## Primary use cases

- Voice-to-voice conversation while Voice Mode is active.
- Wake phrase support: `Hey Mission Command` / `Mission Command` while explicitly enabled.
- Open a top-level surface: Projects, Report, Directory, Intel, Outreach, Content, Manager.
- Open a specific record or project: “Open the Naomi Carter project.”
- Search and disambiguate: “Find Marie Fontaine.” If multiple records match, ask which one.
- Navigate within a record: “Open Naomi’s Files and show the available assets.”
- Switch surfaces: “Close chat and open Outreach follow-up.”
- Capture a note, decision, change log, idea, or meeting note.
- Create a reminder, timer, alarm, or follow-up check-in.
- Ask for a current brief, status read, agent activity read, or blocker read.
- Save a transcript to Mission Command Chat and promote selected items to Notes, Tasks, or Files.

## UI model

### Persistent presence

The pixel Mission Command agent floats in the bottom-right corner. It remains small and does not cover primary controls.

- Green ring: ready/listening.
- Blue ring: processing.
- Gold ring: briefing/speaking.
- Amber ring: waiting for approval.
- Red ring: blocked or failed.
- Gray ring: paused/off.

### Voice dock

Clicking the pixel agent opens a compact dock above it. The dock contains the current mode, pause/stop control, microphone state, and a link to the full chat. It must not automatically open the notification drawer or cover global search.

### Transient feedback

Short acknowledgements appear as a transparent caption above the avatar for about 1–2 seconds: “Opening Directory,” “Reminder staged,” or “Waiting for your confirmation.” Full answers remain in Chat.

## Intent and action contract

The voice layer must normalize speech into a structured intent before any app action:

```text
intent: navigate | search | open_record | show_files | show_activity |
        capture_note | create_reminder | create_timer | brief | draft_action |
        write_action | destructive_action
target: route, record, project, file, or none
parameters: bounded, sanitized values
confidence: high | medium | low
requiresConfirmation: boolean
```

### Safe automatic actions

- Navigate to a known top-level tab.
- Switch Mission Command between Chat and Terminal.
- Open a uniquely matched record or project.
- Show a read-only Files, Notes, Activity, or Follow-Up view.
- Read current status or provide a brief.

### Confirmation-required actions

- Create or save reminders, notes, decisions, or durable change logs.
- Draft a message or external response.
- Modify records, projects, tasks, files, or schedules.
- Send, publish, approve, book, pay, archive, delete, or trigger an agent.

Confirmation must be explicit and scoped: “Confirm reminder for tomorrow at 10 AM.” Voice responses such as “yes,” “confirm,” or “do it” are accepted only while a matching confirmation is pending.

## Storage rules

- Mission Command Chat: canonical transcript of spoken and typed conversation.
- Notes: curated decisions, reminders, observations, ideas, and change logs after explicit save or clear promotion.
- Files: durable briefs, scripts, drafts, and generated artifacts.
- Tasks/Reminders: scheduled commitments with owner, due time, status, and source conversation.
- Do not save every spoken sentence as a permanent note automatically.

## Voice behavior

- Voice answer is shorter than the visual chat answer.
- Voice acknowledgements identify what MC understood and what it is doing.
- MC may say “I found,” “I’m checking,” or “I’m waiting for your confirmation,” but must not claim work that did not occur.
- Responses are interruptible; speaking over MC cancels or truncates the current reply safely.
- Voice Mode is off by default and has visible listening/paused states.
- Wake phrase is optional and only active inside an explicitly enabled Voice Mode.

## Safety and privacy

- No silent always-on microphone by default.
- Clear start, pause, stop, and permission controls.
- No destructive or external action without confirmation.
- No secrets, API keys, raw provider details, or hidden implementation data in spoken or visible responses.
- Context packet is limited to app-safe state, selected records, approved sources, and current conversation context.
- Session transcript retention and note promotion must be visible and reversible where possible.

## Technical shape

1. Client requests an ephemeral realtime session from a dedicated backend endpoint.
2. Browser establishes WebRTC (preferred) or WebSocket transport.
3. Realtime session handles audio input, voice activity detection, interruption, and audio output.
4. Mission Command intent router classifies the user request.
5. Safety/confirmation gate decides whether to navigate, read, stage, or ask.
6. App router performs only allowlisted navigation/read actions.
7. Storage adapters write Chat, Notes, Tasks, or Files only through explicit contracts.
8. Voice and text renderers consume the same normalized Mission Command result.

The existing provider registry should remain the model boundary. Voice providers and text providers must satisfy the same normalized intent, safety, fallback, and latency test contract.

## Test contract

Every provider and voice transport must pass the same fixtures:

- Natural-language intent understanding.
- Route and record disambiguation.
- Confirmation and refusal behavior.
- No-write/no-secret safety behavior.
- Local fallback when provider/session fails.
- Voice interruption and resume behavior.
- Latency budget for first acknowledgement and final response.
- Transcript and note-promotion correctness.
- 100%, 125%, 150%, and 175% UI zoom checks.
- Voice Mode pause/stop and microphone permission checks.

## Phased implementation

### Phase 0 — Contract and prototype

- Approve this spec and intent/action taxonomy.
- Define app-safe context packet and normalized result schema.
- Prototype pixel presence, dock, transient captions, and confirmation state.
- Add fixture-based natural-language and safety tests.

### Phase 1 — Voice command/read pilot

- Add explicit Voice Mode with pause/stop.
- Add ephemeral session endpoint and realtime browser transport.
- Support navigation, search, open record, show files, and read-only briefings.
- Keep all writes disabled.

### Phase 2 — Notes, reminders, and task capture

- Add confirmation-gated note, decision, reminder, timer, and change-log writes.
- Add Chat transcript and promotion controls.
- Add reminder status and cancellation behavior.

### Phase 3 — Broader app control

- Add approved project/file workflows, agent activity reads, and contextual shortcuts.
- Add provider/model switching through the existing registry.
- Expand regression matrix across models and voice transports.

## Acceptance definition

The feature is ready for production implementation only when A1XX can speak a natural command, see what MC understood, know whether it is listening or waiting, confirm any consequential action, interrupt the assistant, find the resulting transcript or note, and recover safely when the model or network fails.

