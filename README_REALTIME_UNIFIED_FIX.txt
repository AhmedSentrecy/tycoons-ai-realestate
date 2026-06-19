REALTIME UNIFIED WEBRTC FIX

This fixes the issue where the voice agent closes immediately.

Why:
The earlier version used the ephemeral-token WebRTC path.
This version uses OpenAI's unified WebRTC path:
browser SDP -> Netlify Function -> OpenAI /v1/realtime/calls -> SDP answer.

Upload to GitHub:
1. Open repo: tycoons-ai-realestate
2. Upload these extracted files:
   - script.js
   - netlify.toml
   - netlify/functions/realtime-connect.js
3. Do not delete:
   - netlify/functions/ai-search.js
   - netlify/functions/realtime-session.js
4. Commit changes to main.
5. Wait for Netlify deploy to become Published.
6. Open https://tycoons-inv.de
7. Press Start Voice Agent.
8. Allow microphone.
9. Say: I want an iVilla Garden in New Cairo.
10. Press Stop Session when finished.

If it still fails:
Check Netlify > Logs & metrics > Functions > realtime-connect.
