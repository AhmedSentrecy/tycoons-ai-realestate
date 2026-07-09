from pathlib import Path
import re, json, gzip, base64

root = Path(__file__).resolve().parent
AGENT_ID = 'agent_2801kw5n6m9tewabcncnykc5w362'
asset_map = {
    'asset_9.js': 'c774c742-6bc9-4360-b251-c48efef58e73',
    'asset_5.js': '57de0e87-3a9d-4599-a85c-63b2c907cffe',
}

p = root / 'asset_9.js'
s = p.read_text()

direct_agent = f'''

  // ---- Tycoons ElevenLabs Conversational AI direct agent, hidden UI ----
  const TYCOONS_ELEVEN_AGENT_ID = '{AGENT_ID}';
  const TYCOONS_ELEVEN_WIDGET_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed';

  function injectTycoonsElevenHideCss() {{
    if (document.getElementById('tycoons-eleven-hide-css')) return;
    const style = document.createElement('style');
    style.id = 'tycoons-eleven-hide-css';
    style.textContent = `
      elevenlabs-convai[data-tycoons-voice-agent="true"] {{
        position: fixed !important;
        left: -9999px !important;
        bottom: -9999px !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
        z-index: -1 !important;
      }}
      elevenlabs-convai[data-tycoons-voice-agent="true"] * {{
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }}
    `;
    document.head.appendChild(style);
  }}

  function ensureTycoonsElevenWidget() {{
    injectTycoonsElevenHideCss();
    let script = document.querySelector('script[data-tycoons-elevenlabs="convai"]');
    if (!script) {{
      script = document.createElement('script');
      script.src = TYCOONS_ELEVEN_WIDGET_SRC;
      script.async = true;
      script.type = 'text/javascript';
      script.setAttribute('data-tycoons-elevenlabs', 'convai');
      document.head.appendChild(script);
    }}

    let widget = document.querySelector(`elevenlabs-convai[agent-id="${{TYCOONS_ELEVEN_AGENT_ID}}"]`);
    if (!widget) {{
      widget = document.createElement('elevenlabs-convai');
      widget.setAttribute('agent-id', TYCOONS_ELEVEN_AGENT_ID);
      widget.setAttribute('data-tycoons-voice-agent', 'true');
      widget.setAttribute('style', 'position:fixed!important;left:-9999px!important;bottom:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;visibility:hidden!important;z-index:-1!important;');
      document.body.appendChild(widget);
    }} else {{
      widget.setAttribute('data-tycoons-voice-agent', 'true');
      widget.setAttribute('style', 'position:fixed!important;left:-9999px!important;bottom:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;visibility:hidden!important;z-index:-1!important;');
    }}
    return widget;
  }}

  function clickTycoonsElevenWidget(widget) {{
    if (!widget) return false;
    const methods = ['open', 'show', 'toggle', 'start', 'startConversation', 'beginConversation', 'connect'];
    for (const method of methods) {{
      if (typeof widget[method] === 'function') {{
        try {{ widget[method](); return true; }} catch (_) {{}}
      }}
    }}
    try {{
      const root = widget.shadowRoot;
      const btn = root && root.querySelector('button,[role="button"],.button');
      if (btn) {{ btn.click(); return true; }}
    }} catch (_) {{}}
    try {{ widget.click(); return true; }} catch (_) {{}}
    return false;
  }}

  function openTycoonsElevenAgent() {{
    const widget = ensureTycoonsElevenWidget();
    const attempt = () => clickTycoonsElevenWidget(widget);
    if (attempt()) return true;
    if (window.customElements && customElements.whenDefined) {{
      customElements.whenDefined('elevenlabs-convai').then(() => {{
        setTimeout(attempt, 120);
        setTimeout(attempt, 650);
      }}).catch(() => {{}});
    }}
    setTimeout(attempt, 350);
    setTimeout(attempt, 1200);
    return true;
  }}

  window.TC_ELEVEN = {{
    agentId: TYCOONS_ELEVEN_AGENT_ID,
    ensureWidget: ensureTycoonsElevenWidget,
    openAgent: openTycoonsElevenAgent
  }};
'''

# Replace prior direct-agent block if present, otherwise insert before TC_VOICE export.
s = re.sub(r"\n\n  // ---- Tycoons ElevenLabs Conversational AI direct agent.*?\n  window\.TC_ELEVEN = \{.*?\n  \};\n", direct_agent + "\n", s, flags=re.S)
if 'TYCOONS_ELEVEN_AGENT_ID' not in s:
    s = s.replace('\n  window.TC_VOICE = {', direct_agent + '\n\n  window.TC_VOICE = {')

s = re.sub(
    r"window\.TC_VOICE = \{([^}]*?)\};",
    lambda m: 'window.TC_VOICE = {' + (m.group(1) if 'openAgent:' in m.group(1) else m.group(1).rstrip() + ', openAgent: openTycoonsElevenAgent') + '};',
    s,
    count=1
)
p.write_text(s)

p = root / 'asset_5.js'
s = p.read_text()
old = """  function onMic() {
    if (voiceState === 'listening') { stopListen.current && stopListen.current(); setVoiceState('idle'); return; }
    window.TC_VOICE.stopSpeaking();"""
new = """  function onMic() {
    if (voiceState === 'listening') { stopListen.current && stopListen.current(); setVoiceState('idle'); return; }
    if (window.TC_ELEVEN && typeof window.TC_ELEVEN.openAgent === 'function') {
      window.TC_ELEVEN.openAgent();
      setVoiceState('idle');
      return;
    }
    if (window.TC_VOICE && typeof window.TC_VOICE.openAgent === 'function') {
      window.TC_VOICE.openAgent();
      setVoiceState('idle');
      return;
    }
    window.TC_VOICE.stopSpeaking();"""
if 'window.TC_ELEVEN.openAgent()' not in s:
    s = s.replace(old, new)
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
print('Tycoons voice patch applied: hidden ElevenLabs direct agent via mic', AGENT_ID)
