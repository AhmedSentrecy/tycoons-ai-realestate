Tycoons restore Realtime Voice patch

Purpose:
- Undo the browser-voice override/fallback behavior that was added after the Voice AI was already working.
- Restore the original Realtime Voice Agent flow through /api/realtime-connect.

Files changed:
- script.js only

Not touched:
- index.html
- styles.css
- animations
- carousel
- WhatsApp
- Supabase/gallery logic
