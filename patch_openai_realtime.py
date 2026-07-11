from pathlib import Path
import re, json, gzip, base64

root = Path(__file__).resolve().parent
asset_map = {
    'asset_9.js': 'c774c742-6bc9-4360-b251-c48efef58e73',
    'asset_5.js': '57de0e87-3a9d-4599-a85c-63b2c907cffe',
}

# ---------- asset_9.js: OpenAI Realtime WebRTC client ----------
p = root / 'asset_9.js'
s = p.read_text()

openai_bridge = r'''

  // ---- Tycoons OpenAI Realtime voice bridge ----
  const TYCOONS_OPENAI_SESSION_URL = '/.netlify/functions/openai-realtime-connect';
  let tycoonsOpenAIPeer = null;
  let tycoonsOpenAIChannel = null;
  let tycoonsOpenAIStream = null;
  let tycoonsOpenAIAudio = null;
  let tycoonsOpenAIActive = false;
  let tycoonsOpenAIConnecting = false;

  function tycoonsOpenAIDispatch(state, extra) {
    window.dispatchEvent(new CustomEvent('tycoons:voice-state', {
      detail: { state, active: state !== 'idle', provider: 'openai', ...(extra || {}) }
    }));
  }

  function tycoonsOpenAISend(event) {
    if (tycoonsOpenAIChannel && tycoonsOpenAIChannel.readyState === 'open') {
      tycoonsOpenAIChannel.send(JSON.stringify(event));
    }
  }

  async function tycoonsOpenAIToolResult(event) {
    const name = event.name;
    const callId = event.call_id;
    let args = {};
    try { args = JSON.parse(event.arguments || '{}'); } catch (_) {}
    let output;
    try {
      if (name === 'search_properties') {
        const query = String(args.query || '').trim();
        window.dispatchEvent(new CustomEvent('tycoons:voice-transcript', { detail: { text: query } }));
        output = typeof window.TC_RUN_VOICE_SEARCH === 'function'
          ? await window.TC_RUN_VOICE_SEARCH(query, { source: 'openai_realtime', args })
          : { success: false, message: 'Website search bridge is not ready.' };
      } else if (name === 'save_lead') {
        output = typeof window.TC_SAVE_VOICE_LEAD === 'function'
          ? await window.TC_SAVE_VOICE_LEAD(args)
          : { success: false, message: 'Lead confirmation UI is not connected yet.' };
      } else {
        output = { success: false, message: 'Unknown tool.' };
      }
    } catch (error) {
      output = { success: false, message: error && error.message ? error.message : 'Tool failed.' };
    }
    tycoonsOpenAISend({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(output || {})
      }
    });
    tycoonsOpenAISend({ type: 'response.create' });
  }

  function handleTycoonsOpenAIEvent(raw) {
    let event;
    try { event = JSON.parse(raw); } catch (_) { return; }
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const text = String(event.transcript || '').trim();
      if (text) window.dispatchEvent(new CustomEvent('tycoons:voice-transcript', { detail: { text } }));
    }
    if (event.type === 'response.function_call_arguments.done') {
      tycoonsOpenAIToolResult(event);
    }
    if (event.type === 'error') {
      console.error('[Tycoons] OpenAI Realtime error', event.error || event);
      tycoonsOpenAIDispatch('error', { message: event.error && event.error.message ? event.error.message : 'OpenAI Realtime error' });
    }
  }

  async function startTycoonsOpenAI() {
    if (tycoonsOpenAIActive || tycoonsOpenAIConnecting) return true;
    tycoonsOpenAIConnecting = true;
    tycoonsOpenAIDispatch('connecting');
    try {
      const pc = new RTCPeerConnection();
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', '');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dc = pc.createDataChannel('oai-events');
      dc.addEventListener('open', () => {
        tycoonsOpenAIConnecting = false;
        tycoonsOpenAIActive = true;
        tycoonsOpenAIDispatch('agent');
      });
      dc.addEventListener('message', (e) => handleTycoonsOpenAIEvent(e.data));
      dc.addEventListener('close', () => stopTycoonsOpenAI());

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdp = pc.localDescription && pc.localDescription.sdp ? pc.localDescription.sdp : offer.sdp;
      const response = await fetch(TYCOONS_OPENAI_SESSION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp })
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || ('OpenAI session failed: ' + response.status));
      }
      await pc.setRemoteDescription({ type: 'answer', sdp: await response.text() });

      tycoonsOpenAIPeer = pc;
      tycoonsOpenAIChannel = dc;
      tycoonsOpenAIStream = stream;
      tycoonsOpenAIAudio = audio;
      return true;
    } catch (error) {
      tycoonsOpenAIConnecting = false;
      tycoonsOpenAIActive = false;
      try { tycoonsOpenAIStream && tycoonsOpenAIStream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      try { tycoonsOpenAIPeer && tycoonsOpenAIPeer.close(); } catch (_) {}
      try { tycoonsOpenAIAudio && tycoonsOpenAIAudio.remove(); } catch (_) {}
      tycoonsOpenAIPeer = null;
      tycoonsOpenAIChannel = null;
      tycoonsOpenAIStream = null;
      tycoonsOpenAIAudio = null;
      tycoonsOpenAIDispatch('error', { message: error && error.message ? error.message : 'Voice start failed.' });
      throw error;
    }
  }

  async function stopTycoonsOpenAI() {
    const pc = tycoonsOpenAIPeer;
    const dc = tycoonsOpenAIChannel;
    const stream = tycoonsOpenAIStream;
    const audio = tycoonsOpenAIAudio;
    tycoonsOpenAIPeer = null;
    tycoonsOpenAIChannel = null;
    tycoonsOpenAIStream = null;
    tycoonsOpenAIAudio = null;
    tycoonsOpenAIConnecting = false;
    tycoonsOpenAIActive = false;
    try { dc && dc.close(); } catch (_) {}
    try { stream && stream.getTracks().forEach((track) => track.stop()); } catch (_) {}
    try { pc && pc.getSenders().forEach((sender) => sender.track && sender.track.stop()); } catch (_) {}
    try { pc && pc.close(); } catch (_) {}
    try { audio && audio.pause(); audio && audio.remove(); } catch (_) {}
    tycoonsOpenAIDispatch('idle');
    return true;
  }

  async function toggleTycoonsOpenAI() {
    return (tycoonsOpenAIActive || tycoonsOpenAIConnecting) ? stopTycoonsOpenAI() : startTycoonsOpenAI();
  }

  window.TC_OPENAI = {
    provider: 'openai',
    model: 'gpt-realtime-2.1',
    startAgent: startTycoonsOpenAI,
    stopAgent: stopTycoonsOpenAI,
    toggleAgent: toggleTycoonsOpenAI,
    isActive: () => tycoonsOpenAIActive || tycoonsOpenAIConnecting
  };

  if (window.TC_VOICE) {
    window.TC_VOICE.startAgent = startTycoonsOpenAI;
    window.TC_VOICE.stopAgent = stopTycoonsOpenAI;
    window.TC_VOICE.toggleAgent = toggleTycoonsOpenAI;
    // OpenAI Realtime is the only allowed website voice output. This prevents
    // old ElevenLabs/browser TTS from speaking after search results appear.
    window.TC_VOICE.speak = function (_text, _lang, onEnd) { if (onEnd) onEnd(); };
    window.TC_VOICE.stopSpeaking = function () {
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {}
    };
  }
'''

s = re.sub(r"\n\n  // ---- Tycoons OpenAI Realtime voice bridge ----.*?\n  if \(window\.TC_VOICE\) \{.*?\n  \}\n", "\n", s, flags=re.S)
s = s.replace('\n  window.TC_VOICE = {', openai_bridge + '\n\n  window.TC_VOICE = {') if 'TYCOONS_OPENAI_SESSION_URL' not in s else s
p.write_text(s)

# ---------- asset_5.js: use OpenAI provider, preserve layout ----------
p = root / 'asset_5.js'
s = p.read_text()

transcript_effect = r'''

  useEffect(() => {
    function onVoiceTranscript(e) {
      const text = e && e.detail && String(e.detail.text || '').trim();
      if (text) setDraft(text);
    }
    window.addEventListener('tycoons:voice-transcript', onVoiceTranscript);
    return () => window.removeEventListener('tycoons:voice-transcript', onVoiceTranscript);
  }, []);
'''
if 'tycoons:voice-transcript' not in s:
    anchor = """  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);"""
    s = s.replace(anchor, anchor + transcript_effect)

# Avoid any old TTS path when OpenAI Realtime initiated the query.
s = s.replace("o.voiceSource === 'elevenlabs_sdk'", "(o.voiceSource === 'elevenlabs_sdk' || o.voiceSource === 'openai_realtime')")

new_onmic = r'''  function onMic() {
    const provider = window.TC_OPENAI;
    const isActive = !!(provider && typeof provider.isActive === 'function' && provider.isActive());
    if (voiceState === 'listening' || voiceState === 'agent' || voiceState === 'connecting' || isActive) {
      stopListen.current && stopListen.current();
      setVoiceState('idle');
      if (provider && typeof provider.stopAgent === 'function') Promise.resolve(provider.stopAgent()).catch(() => {});
      return;
    }
    if (provider && typeof provider.startAgent === 'function') {
      setVoiceState('connecting');
      Promise.resolve(provider.startAgent())
        .then(() => { if (provider.isActive && provider.isActive()) setVoiceState('agent'); })
        .catch((err) => {
          setVoiceState('idle');
          const msg = lang === 'ar'
            ? `تعذر تشغيل البحث الصوتي: ${(err && err.message) || 'خطأ غير معروف'}`
            : `Voice search could not start: ${(err && err.message) || 'unknown error'}`;
          setMessages((m) => [...m, { role: 'assistant', text: msg }]);
          setFsOpen(true);
        });
      return;
    }
    window.TC_VOICE.stopSpeaking();'''
s = re.sub(r"  function onMic\(\) \{.*?\n    window\.TC_VOICE\.stopSpeaking\(\);", new_onmic, s, flags=re.S)
p.write_text(s)

for asset, hashed in asset_map.items():
    dst = root / 'demos/tycoons-site/netlify' / hashed
    if dst.exists():
        dst.write_text((root / asset).read_text())

def patch_manifest(html_path):
    if not html_path.exists():
        return
    text = html_path.read_text()
    m = re.search(r'<script type="__bundler/manifest">(.*?)</script>', text, re.S)
    if not m:
        return
    manifest = json.loads(m.group(1))
    for asset, hashed in asset_map.items():
        if hashed in manifest:
            raw = (root / asset).read_bytes()
            manifest[hashed]['data'] = base64.b64encode(gzip.compress(raw, compresslevel=9)).decode('ascii')
            manifest[hashed]['compressed'] = True
            manifest[hashed]['mime'] = manifest[hashed].get('mime') or 'text/javascript'
    patched = json.dumps(manifest, separators=(',', ':'))
    html_path.write_text(text[:m.start(1)] + patched + text[m.end(1):])

patch_manifest(root / 'index.html')
patch_manifest(root / 'demos/tycoons-site/netlify/index.html')
print('Tycoons OpenAI Realtime patch applied')