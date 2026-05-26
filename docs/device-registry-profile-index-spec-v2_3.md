# Money Mission OS v2_3 Device Registry + Profile Index Spec

Status: Draft for review
Owner: A1XX
Phase: Foundation before true cross-device login
Primary app: money-mission-tracker-v2_3.html
Backend baseline: apps-script-money-mission-tracker-v1_9.gs
Created: 2026-05-26

## Purpose

This spec defines the backend shape needed before Money Mission OS can support true cross-device sign-in.

The current v2_3 app has:
- local sign-in in the browser
- local Device Profile
- Device Readiness
- Setup Transfer checklist
- Transfer Anchor Guard
- Cloud Profile Bootstrap plan
- Drive backup archive with a small Sheet index

Those pieces prove the device is safe and recoverable, but they do not create a real cloud account yet.

The next foundation layer is a small backend registry that can answer:
- Which A1XX profile is this?
- Which devices are known?
- Which device is trusted?
- Which backup marker belongs to the latest known-good state?
- Which setup pointers are safe to read on a new device?

## Non-goals

This phase does not implement full auth.

Do not:
- replace the current local sign-in
- store plaintext passwords
- export webhook tokens in checklists
- auto-restore data onto a new device
- overwrite setup keys during restore
- store large payloads in Sheets
- change Mission Command brain behavior
- change Notion, Calendar, Todoist, or pipeline sync behavior

## Architecture Rule

Sheets are the index.
Drive is the archive.
Notion is the organized knowledge layer.
The browser is the local runtime.
Apps Script is the bridge.

## Proposed Sheets Tabs

### 1. OS Profile Index

One row per profile identity.

Suggested headers:
- Profile ID
- Display Name
- Role
- Timezone
- Preferred Routes
- Build Channel
- Active Device ID
- Latest Backup Marker
- Latest Backup Sheet Row
- Latest Backup Drive File ID
- Latest Backup Size
- Last Verified At
- Status
- Notes

Rules:
- This tab stores small metadata only.
- No passwords.
- No webhook tokens.
- No Notion integration token.
- No large JSON payloads.

### 2. OS Device Registry

One row per known device/browser.

Suggested headers:
- Device ID
- Profile ID
- Device Label
- Device Type
- First Seen At
- Last Seen At
- Last Anchor Check At
- Last Backup Marker
- Last Backup Sheet Row
- Trusted Status
- Trust Reason
- Build Token
- App File
- Status
- Notes

Trusted Status options:
- Pending
- Trusted
- Review
- Revoked
- Archived

Rules:
- A new device starts as Pending.
- A1XX must explicitly trust a device before it can restore profile state automatically.
- Revoked devices must not be allowed to update active profile pointers.
- Archived devices stay visible for history.

### 3. OS Setup Pointer Index

Small map of cloud pointers needed by a new device.

Suggested headers:
- Pointer Key
- Pointer Label
- Pointer Type
- Pointer Value
- Updated At
- Updated By Device ID
- Status
- Notes

Allowed pointer types:
- Apps Script Web App URL
- Clean Workbook ID
- Backup Folder ID
- MC Master Config Page ID
- Team Chat Database ID
- Intelligence HQ Page ID

Rules:
- Store IDs and URLs only when they are safe setup pointers.
- Do not store secret tokens here.
- If a pointer is sensitive, store only a label and require manual entry.

## Proposed Apps Script Endpoints

All endpoints should be token-protected with the existing webhook token pattern.

### POST type: profile_index_upsert

Writes or updates one profile index row.

Expected payload:
- profileId
- displayName
- role
- timezone
- preferredRoutes
- buildChannel
- activeDeviceId
- latestBackupMarker
- latestBackupSheetRow
- latestBackupDriveFileId
- latestBackupSize
- status
- notes

Returns:
- status
- profileId
- row
- updatedAt

### POST type: device_registry_upsert

Writes or updates one device registry row.

Expected payload:
- deviceId
- profileId
- deviceLabel
- deviceType
- lastAnchorCheckAt
- lastBackupMarker
- lastBackupSheetRow
- trustedStatus
- trustReason
- buildToken
- appFile
- status
- notes

Returns:
- status
- deviceId
- row
- trustedStatus
- updatedAt

### GET action: profile_index

Reads profile metadata by profileId.

Expected params:
- profileId

Returns:
- status
- profile
- latestBackup
- activeDevice

### GET action: device_registry

Reads known devices for a profile.

Expected params:
- profileId

Returns:
- status
- devices
- trustedCount
- reviewCount

### GET action: setup_pointers

Reads safe setup pointers only.

Expected params:
- profileId

Returns:
- status
- pointers

## Browser App Behavior

### Phase A: Read-only surface

Add a Cloud Profile / Device Registry panel that can show:
- profile ID
- active source device
- latest backup marker
- trusted device count
- next action

No writes yet.

### Phase B: Device check-in

After Device Readiness is clean, the app can send a small device registry upsert:
- device ID
- device label
- build token
- latest backup marker
- latest anchor check

This should require a visible user action.

### Phase C: Manual trust

A1XX can mark a device as trusted.

Trusted device rules:
- trusted devices can read profile metadata
- trusted devices can request restore preview
- trusted devices still cannot overwrite protected setup keys by default

### Phase D: Profile bootstrap

Once a device is trusted, it can read:
- profile index
- latest backup pointer
- safe setup pointers

The app can then guide A1XX through a restore preview.

### Phase E: True auth later

Only after the registry works should the app add real account auth.

Auth should be added last because it affects:
- login flow
- device trust
- password/PIN handling
- recovery
- revocation
- setup safety

## Restore Policy

Restore must remain controlled.

Default restore:
- restore approved app data keys
- skip protected setup keys
- skip local device profile key
- skip transient runtime keys

Protected keys:
- Apps Script URL
- webhook token
- Todoist token
- Mission sync config
- Notion secret if ever locally present
- local Device Profile

Restore may overwrite protected keys only if:
- A1XX explicitly chooses that mode
- the app warns clearly
- a fresh Drive backup exists first

## Drive Storage Policy

Drive stores:
- full backup JSON files
- future profile artifacts if they become large
- device registry exports if needed
- restore audit snapshots if needed

Drive file naming:
- mmos-profile-{profileId}-{timestamp}.json
- mmos-device-registry-{profileId}-{timestamp}.json
- mmos-backup-{backupMarker}-{timestamp}.json

Do not store large payloads in Sheets.

## Notion Role

Notion should mirror human-readable knowledge, not replace the operational backend.

Good Notion records:
- profile setup notes
- trusted device decisions
- implementation checklist
- schema decisions
- agent/team handoffs

Notion should not be the only source for critical restore operations.

## Security Rules

- Never store plaintext passwords.
- Never store webhook token in Sheet rows.
- Never put secrets into copied checklists.
- Never auto-trust a new device.
- Never delete device records; archive or revoke.
- Never let an untrusted device write profile pointers.
- Never allow a restore without preview.
- Never store large backup payloads in Sheets.

## UI Copy Rules

Use clear status language:
- Local only
- Pending trust
- Trusted
- Review needed
- Anchor ready
- Restore preview only

Avoid implying login-anywhere is active until backend auth exists.

Suggested copy:
"This prepares cross-device access. It does not enable cloud login yet."

## Implementation Phases

### Phase 1: Spec approval

Review this document.
Confirm schema names.
Confirm whether Sheets tabs should be created automatically or manually.

### Phase 2: Apps Script registry layer

Add headers and helper functions.
Add profile/device GET and POST handlers.
Add small-row write guards.
Add Activity Log entries.

### Phase 3: Frontend read-only panel

Show profile/device registry status.
No writes yet.

### Phase 4: Manual device check-in

Add "Register this device" button.
Write device row after A1XX confirms.

### Phase 5: Trust workflow

Add trusted/pending/revoked device state.
Keep trust manual.

### Phase 6: Restore integration

Allow trusted devices to locate latest backup and start restore preview.
Still skip protected keys by default.

### Phase 7: Auth upgrade

Add true account login only after registry and restore are stable.

## QA Checklist

Before implementation:
- Confirm no existing app behavior changes are needed.
- Confirm Apps Script v1_9 is the backend baseline.
- Confirm clean workbook is active.
- Confirm latest Drive backup is verified.

Backend QA:
- Profile index row writes small metadata only.
- Device registry row writes small metadata only.
- Existing State Backups Drive archive still works.
- Unknown POST types still fail safely.
- Existing health endpoint still works.
- Existing Mission Command events still work.

Frontend QA:
- New panel does not imply login-anywhere is active.
- Untrusted device cannot restore automatically.
- Device Profile remains local-only.
- Setup Transfer checklist still omits secrets.
- Restore preview still skips protected keys.

Manual QA:
- Register current device.
- Confirm OS Device Registry row appears.
- Confirm latest backup marker matches Diagnostics.
- Mark device Pending/Trusted manually in Sheet if needed.
- Confirm app reads registry without breaking if tab is missing.
- Confirm app handles empty registry gracefully.

## Approval Gate

Do not implement backend endpoints until A1XX approves:
- tab names
- header schema
- first device trust rule
- whether the app may create the tabs automatically
- whether Device Registry lives only in Sheets first or mirrors to Notion later

