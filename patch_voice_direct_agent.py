from pathlib import Path
import re, json, gzip, base64

root = Path(__file__).resolve().parent
AGENT_ID = 'agent_2801kw5n6m9tewabcncnykc5w362'
asset_map = {
    'asset_9.js': 'c774c742-6bc9-4360-b251-c48efef58e73',
    'asset_5.js': '57de0e87-3a9d-4599-a85c-63b2c907cffe',
}

# ---------- asset_9.js: ElevenLabs SDK client-tools bridge ----------
p = root / 'asset_9.js'
s = p.read_text()

sdk_bridge = f'''

  // ---- Tycoons ElevenLabs SDK voice-to-search bridge ----
  // Keeps the site layout unchanged. The website mic starts/stops the SDK session.
  // ElevenLabs client tools push the heard search intent back into the React search UI.
  const TYCOONS_ELEVEN_AGENT_ID = '{AGENT_ID}';
  const TYCOONS_ELEVEN_SDK_URLS = [
    '/assets/elevenlabs-client.js',
    'https://esm.sh/@elevenlabs/client?bundle',
    'https://esm.sh/@elevenlabs/client@latest?bundle',
    'https://cdn.jsdelivr.net/npm/@elevenlabs/client/+esm'
  ];
  let tycoonsElevenConversation = null;
  let tycoonsElevenSdk = null;
  let tycoonsElevenActive = false;
  let tycoonsElevenConnecting = false;

  function tycoonsVoiceDispatch(state, extra) {{
    window.dispatchEvent(new CustomEvent('tycoons:voice-state', {{ detail: {{ state, active: state !== 'idle', ...(extra || {{}}) }} }}));
  }}

  async function loadTycoonsElevenSdk() {{
    if (tycoonsElevenSdk) return tycoonsElevenSdk;
    let lastError = null;
    for (const url of TYCOONS_ELEVEN_SDK_URLS) {{
      try {{
        const mod = await import(url);
        const Conversation = mod.Conversation || (mod.default && mod.default.Conversation);
        if (Conversation && typeof Conversation.startSession === 'function') {{
          tycoonsElevenSdk = Conversation;
          return tycoonsElevenSdk;
        }}
        lastError = new Error('Conversation.startSession was not found');
      }} catch (err) {{
        lastError = err;
        console.warn('[Tycoons] ElevenLabs SDK source failed', url, err);
      }}
    }}
    throw lastError || new Error('ElevenLabs SDK could not load');
  }}

  async function requestTycoonsMicPermission() {{
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {{
      throw new Error('microphone_not_supported');
    }}
    const stream = await navigator.mediaDevices.getUserMedia({{ audio: true }});
    stream.getTracks().forEach((track) => track.stop());
  }}

  function buildTycoonsSearchQuery(args) {{
    args = args || {{}};
    return [
      args.query,
      args.search_query,
      args.text,
      args.user_request,
      args.location,
      args.area,
      args.unit_type,
      args.budget,
      args.budget_range,
      args.purpose,
      args.delivery_timing
    ].map((value) => String(value || '').trim()).filter(Boolean).join(' ').trim();
  }}

  async function tycoonsSearchProperties(args) {{
    const query = buildTycoonsSearchQuery(args);
    if (!query) {{
      return {{ success: false, message: 'Ask for an area, budget, or unit type first.' }};
    }}
    try {{
      if (typeof window.TC_RUN_VOICE_SEARCH === 'function') {{
        const result = await window.TC_RUN_VOICE_SEARCH(query, {{ source: 'elevenlabs_sdk', args: args || {{}} }});
        return {{
          success: true,
          query,
          shown_on_page: true,
          message: 'The search results are shown on the website.',
          results_count: result && typeof result.results_count === 'number' ? result.results_count : undefined,
          results: result && Array.isArray(result.results) ? result.results : undefined
        }};
      }}
      return {{ success: false, query, shown_on_page: false, message: 'Website search bridge is not ready yet.' }};
    }} catch (err) {{
      console.error('[Tycoons] ElevenLabs search_properties failed', err);
      return {{ success: false, query, message: err && err.message ? err.message : 'Search failed.' }};
    }}
  }}

  async function tycoonsSaveLead(args) {{
    try {{
      if (typeof window.TC_SAVE_VOICE_LEAD === 'function') {{
        return await window.TC_SAVE_VOICE_LEAD(args || {{}});
      }}
      return {{ success: false, message: 'Lead saving is not connected on this page yet.' }};
    }} catch (err) {{
      return {{ success: false, message: err && err.message ? err.message : 'Lead saving failed.' }};
    }}
  }}

  async function startTycoonsElevenAgent() {{
    if (tycoonsElevenConversation || tycoonsElevenActive || tycoonsElevenConnecting) return true;
    tycoonsElevenConnecting = true;
    tycoonsVoiceDispatch('connecting');
    try {{
      await requestTycoonsMicPermission();
      const Conversation = await loadTycoonsElevenSdk();
      tycoonsElevenConversation = await Conversation.startSession({{
        agentId: TYCOONS_ELEVEN_AGENT_ID,
        connectionType: 'webrtc',
        clientTools: {{
          search_properties: tycoonsSearchProperties,
          show_results_on_page: async (args = {{}}) => tycoonsSearchProperties(args),
          save_lead: tycoonsSaveLead
        }},
        onConnect: async () => {{
          tycoonsElevenConnecting = false;
          tycoonsElevenActive = true;
          try {{
            if (tycoonsElevenConversation && typeof tycoonsElevenConversation.setMicMuted === 'function') {{
              await tycoonsElevenConversation.setMicMuted(false);
            }}
          }} catch (_) {{}}
          tycoonsVoiceDispatch('agent');
        }},
        onDisconnect: () => {{
          tycoonsElevenConnecting = false;
          tycoonsElevenActive = false;
          tycoonsElevenConversation = null;
          tycoonsVoiceDispatch('idle');
        }},
        onError: (error) => {{
          console.error('[Tycoons] ElevenLabs SDK error', error);
          tycoonsVoiceDispatch('error', {{ message: error && error.message ? error.message : String(error || 'voice_error') }});
        }}
      }});
      tycoonsElevenActive = true;
      tycoonsElevenConnecting = false;
      tycoonsVoiceDispatch('agent');
      return true;
    }} catch (err) {{
      tycoonsElevenConnecting = false;
      tycoonsElevenActive = false;
      tycoonsElevenConversation = null;
      tycoonsVoiceDispatch('error', {{ message: err && err.message ? err.message : String(err || 'voice_start_failed') }});
      throw err;
    }}
  }}

  async function stopTycoonsElevenAgent() {{
    const conversation = tycoonsElevenConversation;
    tycoonsElevenConversation = null;
    tycoonsElevenActive = false;
    tycoonsElevenConnecting = false;
    if (conversation) {{
      const methods = ['endSession', 'disconnect', 'stop', 'close'];
      for (const method of methods) {{
        if (typeof conversation[method] === 'function') {{
          try {{ await conversation[method](); break; }} catch (_) {{}}
        }}
      }}
    }}
    tycoonsVoiceDispatch('idle');
    return true;
  }}

  async function toggleTycoonsElevenAgent() {{
    return (tycoonsElevenActive || tycoonsElevenConnecting) ? stopTycoonsElevenAgent() : startTycoonsElevenAgent();
  }}

  window.TC_ELEVEN = {{
    agentId: TYCOONS_ELEVEN_AGENT_ID,
    startAgent: startTycoonsElevenAgent,
    stopAgent: stopTycoonsElevenAgent,
    toggleAgent: toggleTycoonsElevenAgent,
    isActive: () => tycoonsElevenActive || tycoonsElevenConnecting,
    searchProperties: tycoonsSearchProperties
  }};
'''

# Remove previous widget/direct-agent blocks from earlier patches.
s = re.sub(r"\n\n  // ---- Tycoons ElevenLabs Conversational AI direct agent.*?\n  window\.TC_ELEVEN = \{.*?\n  \};\n", "\n", s, flags=re.S)
s = re.sub(r"\n\n  // ---- Tycoons ElevenLabs SDK voice-to-search bridge ----.*?\n  window\.TC_ELEVEN = \{.*?\n  \};\n", "\n", s, flags=re.S)

# Insert SDK bridge before TC_VOICE export.
if 'TYCOONS_ELEVEN_AGENT_ID' not in s:
    s = s.replace('\n  window.TC_VOICE = {', sdk_bridge + '\n\n  window.TC_VOICE = {')

# Add SDK controls to TC_VOICE export without disturbing existing listen/speak fallback.
def patch_voice_export(match):
    body = match.group(1)
    for addition in ['startAgent: startTycoonsElevenAgent', 'stopAgent: stopTycoonsElevenAgent', 'toggleAgent: toggleTycoonsElevenAgent']:
        if addition.split(':')[0] not in body:
            body = body.rstrip() + ', ' + addition
    return 'window.TC_VOICE = {' + body + '};'

s = re.sub(r"window\.TC_VOICE = \{([^}]*?)\};", patch_voice_export, s, count=1)
p.write_text(s)

# ---------- asset_5.js: expose React search bridge + use mic as SDK start/stop ----------
p = root / 'asset_5.js'
s = p.read_text()

bridge_effect = """

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
        const compact = (res.items || []).slice(0, 3).map((p) => ({
          project: p.compound || p.title_en || p.title_ar || '',
          developer: p.developer || '',
          location: p.location_text || p.area_raw || p.area || '',
          unit_type: p.unit_type_raw || p.unit_type || '',
          bedrooms: p.bedrooms_text || (p.bedrooms ? `${p.bedrooms} bedrooms` : ''),
          area: p.size_sqm || p.area_sqm || '',
          starting_price: p.price || 0
        }));
        return { success: true, query: q, shown_on_page: true, results_count: compact.length, results: compact };
      } catch (_) {
        return { success: true, query: q, shown_on_page: true };
      }
    };
    return () => {
      if (window.TC_RUN_VOICE_SEARCH) delete window.TC_RUN_VOICE_SEARCH;
    };
  }, [lang, route, dataTick]);
"""

if 'TC_RUN_VOICE_SEARCH' not in s:
    anchor = """  useEffect(() => {
    function onReady(e) { setDataTick((n) => n + 1); setDataSource(e.detail); }
    window.addEventListener('tycoons:data-ready', onReady);
    return () => window.removeEventListener('tycoons:data-ready', onReady);
  }, []);"""
    s = s.replace(anchor, anchor + bridge_effect)

new_onmic_head = """  function onMic() {
    if (voiceState === 'listening' || voiceState === 'agent' || voiceState === 'connecting') {
      stopListen.current && stopListen.current();
      const stopAgent = (window.TC_ELEVEN && window.TC_ELEVEN.stopAgent) || (window.TC_VOICE && window.TC_VOICE.stopAgent);
      if (typeof stopAgent === 'function') Promise.resolve(stopAgent()).catch(() => {});
      setVoiceState('idle');
      return;
    }
    const startAgent = (window.TC_ELEVEN && window.TC_ELEVEN.startAgent) || (window.TC_VOICE && window.TC_VOICE.startAgent);
    if (typeof startAgent === 'function') {
      setVoiceState('connecting');
      Promise.resolve(startAgent())
        .then(() => setVoiceState('agent'))
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
    window.TC_VOICE.stopSpeaking();"""

s = re.sub(r"  function onMic\(\) \{.*?\n    window\.TC_VOICE\.stopSpeaking\(\);", new_onmic_head, s, flags=re.S)

# Make button copy reflect SDK agent state while keeping layout/classes unchanged.
s = s.replace("{voiceState === 'listening' ? 'Listening…' : voiceState === 'agent' ? (lang === 'ar' ? 'إيقاف' : 'Stop') : L.hero.mic}", "{voiceState === 'listening' ? 'Listening…' : voiceState === 'connecting' ? (lang === 'ar' ? 'جاري التشغيل…' : 'Starting…') : voiceState === 'agent' ? (lang === 'ar' ? 'إيقاف' : 'Stop') : L.hero.mic}")
s = s.replace("{voiceState === 'listening' ? 'Listening…' : L.hero.mic}", "{voiceState === 'listening' ? 'Listening…' : voiceState === 'connecting' ? (lang === 'ar' ? 'جاري التشغيل…' : 'Starting…') : voiceState === 'agent' ? (lang === 'ar' ? 'إيقاف' : 'Stop') : L.hero.mic}")
s = s.replace("voiceState === 'listening' ?", "(voiceState === 'listening' || voiceState === 'agent' || voiceState === 'connecting') ?")
s = s.replace("voiceState === 'listening' || voiceState === 'agent') ?", "voiceState === 'listening' || voiceState === 'agent' || voiceState === 'connecting') ?")
p.write_text(s)

# Mirror patched assets into Netlify hashed bundle files if present.
for asset, hashed in asset_map.items():
    dst = root / 'demos/tycoons-site/netlify' / hashed
    if dst.exists():
        dst.write_text((root / asset).read_text())

# Repack modified assets into embedded index.html manifests.
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
print('Tycoons voice patch applied: ElevenLabs SDK client tools bridge + site mic start/stop', AGENT_ID)
