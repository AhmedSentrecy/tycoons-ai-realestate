TYCOONS WHATSAPP LEAD TRACKING V1

Upload/replace all package contents in GitHub.

What this adds:
1. WhatsApp click tracking source inside every WhatsApp message.
2. Frontend tracking in script.js for:
   - header WhatsApp
   - floating WhatsApp
   - lead section WhatsApp
   - static page WhatsApp
   - dynamic unit card WhatsApp
   - dynamic project card WhatsApp

3. A Supabase SQL file:
   supabase_whatsapp_clicks.sql

Important:
- The WhatsApp links will work immediately even before running the SQL.
- Supabase logging starts only after you run supabase_whatsapp_clicks.sql in Supabase SQL Editor.
- If the table does not exist yet, the website will NOT break. It will only warn in console and still open WhatsApp.

After upload:
1. Commit all files to GitHub.
2. Wait Netlify deploy.
3. Run supabase_whatsapp_clicks.sql in Supabase SQL Editor.
4. Test buttons:
   - header WhatsApp
   - floating WhatsApp
   - a unit card WhatsApp
5. Check Supabase table:
   public.whatsapp_clicks
