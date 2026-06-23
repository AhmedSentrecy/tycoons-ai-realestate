TYCOONS WHATSAPP RICH MESSAGE V1

Upload/replace all package contents in GitHub.

What changed:
1. WhatsApp messages from unit cards now include:
   - Project
   - Unit type
   - Bedrooms
   - Area
   - Starting price
   - Delivery
   - Finishing
   - Image link
   - Brochure link
   - Video link
   - Page URL
   - Source
   - Tracking ID

2. Project card WhatsApp messages now include:
   - Project
   - Starting price
   - Image link
   - Brochure link
   - Video link
   - Page URL
   - Source
   - Tracking ID

Important limitation:
- A wa.me click link can only prefill a text message.
- It cannot automatically attach an image file or send a real WhatsApp card.
- This patch includes image/brochure/video links in the message so WhatsApp can show clickable links and sometimes link previews.
- Real media/card sending requires WhatsApp Cloud API/backend message sending.

No Supabase admin changes required for the message links to work.
Optional SQL migration included only if you later want to store media URLs in tracking.
