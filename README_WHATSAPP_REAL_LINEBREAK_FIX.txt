TYCOONS WHATSAPP REAL LINEBREAK FIX

Upload/replace all package contents in GitHub.

Problem:
The previous WhatsApp message still showed literal \n text.

Cause:
JavaScript was joining lines with "\\n" at runtime, which creates a visible backslash+n.

Fix:
JavaScript now joins lines with "\n" at runtime, which creates real WhatsApp line breaks.

No Supabase changes.
No admin changes.
No database changes.
