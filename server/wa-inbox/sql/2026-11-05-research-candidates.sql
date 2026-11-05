-- What the web said without 2 sites (one site, or sites that disagree) is kept for the admin to pick:
-- wa_project_drafts.candidates: field -> [{value, sources}]
-- wa_unit_inbox.web_candidates: {developer: {value, sources}, project: {value, sources, project_id}, fields: {field: [{value, sources}]}}
alter table public.wa_project_drafts add column if not exists candidates jsonb;
alter table public.wa_unit_inbox add column if not exists web_candidates jsonb;
