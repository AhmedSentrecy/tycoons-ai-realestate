-- Unsure groupings (two WhatsApp names that may or may not be one project) are checked on the web once.
-- grouping_checked_at = when that check ran; drafts still unsure after it wait for the admin.
alter table public.wa_project_drafts add column if not exists grouping_checked_at timestamptz;
