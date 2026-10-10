-- SEO/GEO fields for editorial guides. Additive only: existing rows keep working
-- with empty defaults, and no existing column, policy or function is removed.
--
-- focus_keyword   the main search phrase the guide targets (editor-facing + meta)
-- key_takeaways   short "answer first" bullets rendered at the top (GEO / AI answers)
-- faq             [{question, answer}] rendered as a visible FAQ + FAQPage schema
-- translation_key shared id that pairs the Arabic and English versions (hreflang)
-- hero_image_url  optional https image for og:image and Article.image

alter table public.editorial_articles
  add column if not exists focus_keyword text not null default '',
  add column if not exists key_takeaways jsonb not null default '[]'::jsonb,
  add column if not exists faq jsonb not null default '[]'::jsonb,
  add column if not exists translation_key uuid,
  add column if not exists hero_image_url text;

do $$ begin
  alter table public.editorial_articles add constraint editorial_article_focus_keyword_len
    check (char_length(focus_keyword) <= 80);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.editorial_articles add constraint editorial_article_takeaways_shape
    check (jsonb_typeof(key_takeaways) = 'array' and jsonb_array_length(key_takeaways) <= 6);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.editorial_articles add constraint editorial_article_faq_shape
    check (jsonb_typeof(faq) = 'array' and jsonb_array_length(faq) <= 10);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.editorial_articles add constraint editorial_article_hero_image_https
    check (hero_image_url is null or (hero_image_url ~ '^https://[^\s]+$' and char_length(hero_image_url) <= 2000));
exception when duplicate_object then null; end $$;

-- At most one article per language inside a translation pair.
create unique index if not exists editorial_articles_translation_language_uidx
  on public.editorial_articles (translation_key, language) where translation_key is not null;

-- Public view: same columns as before, new publication-safe columns appended at the end.
create or replace view public.published_editorial_articles
with (security_barrier = true, security_invoker = true)
as
select id, 'published'::text as status, language, title, slug, excerpt, body_markdown, meta_title, meta_description,
       target_type, project_id, area_name, source_refs, reviewed_by_name,
       reviewed_at, published_at, updated_at,
       focus_keyword, key_takeaways, faq, translation_key, hero_image_url
from public.editorial_articles
where status = 'published' and published_at is not null and reviewed_at is not null;

grant select (focus_keyword, key_takeaways, faq, translation_key, hero_image_url)
  on public.editorial_articles to anon, authenticated;
revoke all on public.published_editorial_articles from public;
revoke all on public.published_editorial_articles from anon, authenticated;
grant select on public.published_editorial_articles to anon, authenticated;
