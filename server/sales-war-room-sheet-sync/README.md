# Sales War Room CRM feedback sync

Imports CRM feedback from a distribution sheet (`التوزيع`) and a status sheet (`CRM Status` / `Wesam - CRM Status`). A lead enters the War Room only after it has a non-empty CRM feedback event. The current CRM agent owns the lead. `Ahmed Yehya` in CRM maps to `ahmed-yehia` in the War Room.

The Google Script scans every five minutes, because edits made by another Apps Script do not fire a normal `onEdit` trigger. Only comments written after setup are imported. The original CRM lead-entry time, feedback time, and author are retained, and imported text is left unchanged. Repeat scans are safe because each CRM comment has a unique key.

## Installation

1. Apply `migration.sql` to the Tycoons Supabase database and deploy `index.ts` as `sales-war-room-sheet-sync` with JWT verification disabled. Authentication is enforced with the dedicated `x-war-room-sync-token` header inside the function.
2. Generate a random token of at least 40 characters. Save only its SHA-256 hex digest in `public.sales_war_room_sync_keys`, under `name = 'google_sheets'`. Keep the original token private.
3. Create a standalone Google Apps Script, paste `google-apps-script.gs`, and set `WAR_ROOM_SYNC_TOKEN` to the original token, `WAR_ROOM_DISTRIBUTION_SHEET_ID` to the distribution spreadsheet ID, and `WAR_ROOM_STATUS_SHEET_ID` to the status spreadsheet ID in **Project Settings → Script Properties**. Do not publish these values in the source code.
4. Run `setupWarRoomFeedbackSync()` once with a Google account permitted to read both spreadsheets. Approve the Sheets and UrlFetch scopes. The setup captures the current time and creates one five-minute trigger.
5. Check **Executions** after a fresh feedback is entered and inspect that same lead's Activity & Feedback in the War Room. The script logs unknown agents, duplicate phones, and owner conflicts for review.

The script doesn't write to either source spreadsheet. Existing manually created leads can be linked by a unique phone belonging to the same agent. Blank feedback, unknown agents, and ambiguous matches are skipped. If the same CRM ID appears in both spreadsheets, it resolves to one War Room lead and duplicate comments are ignored.

To intentionally import older feedback, set `WAR_ROOM_SYNC_SINCE` in Script Properties to an earlier ISO date and run `syncWarRoomFeedback()`; this can add many historical leads, so inspect the expected volume first.
