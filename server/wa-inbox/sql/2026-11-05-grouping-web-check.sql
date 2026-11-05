-- Unsure groupings (two WhatsApp names that may or may not be one project) are checked on the web once.
-- grouping_checked_at = when that check ran; drafts still unsure after it wait for the admin.
alter table public.wa_project_drafts add column if not exists grouping_checked_at timestamptz;

-- Unit doubts about the project or the developer are searched on the web once per unit (web_checked_at).
-- web_filled = details the web filled for a site project's unit: field -> the 2+ source URLs.
alter table public.wa_unit_inbox add column if not exists web_checked_at timestamptz;
alter table public.wa_unit_inbox add column if not exists web_filled jsonb;
