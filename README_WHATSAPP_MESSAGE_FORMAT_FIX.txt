TYCOONS WHATSAPP MESSAGE FORMAT FIX

Upload/replace all package contents in GitHub.

Problem fixed:
- WhatsApp message was showing literal \n instead of real line breaks.

What changed:
1. Messages now use real line breaks.
2. Unit/project card messages are cleaner:
   - Project
   - Unit type
   - Bedrooms
   - Area
   - Starting price
   - Delivery
   - Finishing
   - Links
   - Tracking ID
   - Source

Important:
- wa.me links cannot attach a real image/card automatically.
- This fix sends clean text and links.
- Real image/card sending requires WhatsApp Cloud API backend sending.

No Supabase changes required.
No admin changes.
No database changes.
