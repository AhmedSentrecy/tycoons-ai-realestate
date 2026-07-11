from pathlib import Path
import re, json, gzip, base64

root = Path(__file__).resolve().parent
asset_map = {
    'asset_9.js': 'c774c742-6bc9-4360-b251-c48efef58e73',
    'asset_5.js': '57de0e87-3a9d-4599-a85c-63b2c907cffe',
}

# ---------- Realtime state events ----------
p = root / 'asset_9.js'
s = p.read_text()

marker = """    if (event.type === 'conversation.item.input_audio_transcription.completed') {"""
state_block = """    if (event.type === 'input_audio_buffer.speech_started') {
      tycoonsOpenAIDispatch('listening');
    }
    if (event.type === 'input_audio_buffer.speech_stopped') {
      tycoonsOpenAIDispatch('thinking');
    }
    if (event.type === 'response.output_audio.started') {
      tycoonsOpenAIDispatch('speaking');
    }
"""
if "event.type === 'input_audio_buffer.speech_started'" not in s:
    s = s.replace(marker, state_block + marker)

# Ensure stop closes any currently playing remote stream immediately.
s = s.replace(
    """    try { audio && audio.pause(); audio && audio.remove(); } catch (_) {}""",
    """    try { if (audio) { audio.pause(); audio.srcObject = null; audio.remove(); } } catch (_) {}"""
)
p.write_text(s)

# ---------- Search bridge + UI state sync ----------
p = root / 'asset_5.js'
s = p.read_text()

bridge_effect = r'''

  useEffect(() => {
    function onVoiceState(e) {
      const state = e && e.detail && e.detail.state;
      if (state === 'error') setVoiceState('idle');
      else if (state) setVoiceState(state);
    }
    window.addEventListener('tycoons:voice-state', onVoiceState);
    return () => window.removeEventListener('tycoons:voice-state', onVoiceState);
  }, []);

  useEffect(() => {
    window.TC_RUN_VOICE_SEARCH = async (query, meta) => {
      const q = String(query || '').trim();
      if (!q) return { success: false, results_count: 0, results: [] };
      setDraft(q);
      if (route !== 'home') setRoute('home');
      setFsOpen(true);
      setTimeout(scrollToConsole, route !== 'home' ? 90 : 20);
      runQuery(q, { voiceSource: meta && meta.source });
      try {
        const filters = window.TC_INTENT.parseQuery(q);
        const res = window.TC_INTENT.search(q, window.TYCOONS_DATA.PROJECTS, lang, filters);
        return {
          success: true,
          shown_on_page: true,
          query: q,
          results_count: (res.items || []).length,
          results: (res.items || []).slice(0, 3).map((p) => ({
            project: p.compound || p.title_en || p.title_ar || '',
            developer: p.developer || '',
            location: p.location_text || p.area_raw || p.area || '',
            unit_type: p.unit_type_raw || p.unit_type || '',
            starting_price: p.price || 0
          }))
        };
      } catch (_) {
        return { success: true, shown_on_page: true, query: q };
      }
    };
    return () => { delete window.TC_RUN_VOICE_SEARCH; };
  }, [lang, route, dataTick]);
'''

if 'window.TC_RUN_VOICE_SEARCH = async' not in s:
    anchor = """  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);"""
    s = s.replace(anchor, anchor + bridge_effect)

# Queries triggered by OpenAI Realtime must not start the old ElevenLabs TTS path.
s = s.replace(
    """      setMessages((m) => [...m, { role: 'assistant', text: reply, items: res.items }]);
      setVoiceState('speaking');
      window.TC_VOICE.speak(reply, lang, () => setVoiceState('idle'));""",
    """      setMessages((m) => [...m, { role: 'assistant', text: reply, items: res.items }]);
      if (o.voiceSource === 'openai_realtime') {
        setVoiceState((window.TC_OPENAI && window.TC_OPENAI.isActive && window.TC_OPENAI.isActive()) ? 'agent' : 'idle');
      } else {
        setVoiceState('speaking');
        window.TC_VOICE.speak(reply, lang, () => setVoiceState('idle'));
      }"""
)
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
print('Tycoons OpenAI full-duplex patch applied')
