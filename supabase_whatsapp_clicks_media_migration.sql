-- Optional WhatsApp rich message tracking migration
-- Run this after whatsapp_clicks table exists if you want to store media links too.

alter table public.whatsapp_clicks
add column if not exists area_sqm numeric,
add column if not exists delivery_text text,
add column if not exists finishing text,
add column if not exists image_url text,
add column if not exists brochure_url text,
add column if not exists video_url text;
