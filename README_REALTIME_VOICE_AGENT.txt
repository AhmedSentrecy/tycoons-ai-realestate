TYCOONS REALTIME VOICE AGENT - OPTION B

Upload these files to GitHub repo: tycoons-ai-realestate

Files included:
- index.html
- styles.css
- script.js
- netlify.toml
- netlify/functions/realtime-session.js

Important:
- Do not delete netlify/functions/ai-search.js.
- Keep OPENAI_API_KEY in Netlify environment variables only.
- OPENAI_REALTIME_MODEL should be set to gpt-realtime-2.
- Optional: OPENAI_REALTIME_VOICE can be marin.

GitHub steps:
1. Open GitHub repo: tycoons-ai-realestate.
2. Click Add file > Upload files.
3. Drag these extracted files/folders.
4. Make sure netlify/functions/realtime-session.js is uploaded.
5. Commit changes to main.
6. Wait for Netlify deploy to become Published.
7. Open https://tycoons-inv.de
8. Press Start Voice Agent.
9. Allow microphone.
10. Say: I want an iVilla Garden in New Cairo.
11. Press Stop Session when finished.

If it fails:
- Check Netlify > Logs & metrics > Functions > realtime-session.
- Check browser microphone permission.
- Confirm OpenAI billing/Realtime model access.
