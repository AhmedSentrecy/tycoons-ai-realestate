TYCOONS WHATSAPP IMAGE PREVIEW FIRST V1

Upload/replace all package contents in GitHub.

Why this patch:
WhatsApp usually generates the link preview from the first URL in the message.
The previous message placed Page first, so WhatsApp previewed tycoons-inv.de instead of the property image.

What changed:
1. For unit/project card WhatsApp messages, the image URL is now the first URL in the message.
2. Page URL moved lower under Links.
3. Text formatting and tracking remain unchanged.

Important limitation:
WhatsApp may still refuse to preview Google Drive thumbnail URLs.
If the preview still does not show the actual image, the real solution is to host images on a direct public image CDN/Supabase Storage and use that direct image URL, or use WhatsApp Cloud API to send an actual media message.

No Supabase changes.
No admin changes.
No database changes.
