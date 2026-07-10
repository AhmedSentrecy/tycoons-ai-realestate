from pathlib import Path
import re, json, gzip, base64

root = Path(__file__).resolve().parent
asset_map = {
    'asset_9.js': 'c774c742-6bc9-4360-b251-c48efef58e73',
    'asset_5.js': '57de0e87-3a9d-4599-a85c-63b2c907cffe',
}

# ---------- Harden ElevenLabs SDK stop/toggle ----------
p = root / 'asset_9.js'
s = p.read_text()

# Add captured media/WebRTC holders after the SDK state vars.
s = s.replace(
    "  let tycoonsElevenConnecting = false;",
    """  let tycoonsElevenConnecting = false;
  let tycoonsElevenStartToken = 0;
  const tycoonsElevenStreams = [];
  const tycoonsElevenPeers = [];
  let tycoonsOriginalGetUserMedia = null;
  let tycoonsOriginalRTCPeerConnection = null;"""
)

capture_helpers = r'''

  function installTycoonsVoiceCaptures() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !tycoonsOriginalGetUserMedia) {
        tycoonsOriginalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async function patchedTycoonsGetUserMedia(constraints) {
          const stream = await tycoonsOriginalGetUserMedia(constraints);
          try { tycoonsElevenStreams.push(stream); } catch (_) {}
          return stream;
        };
      }
    } catch (_) {}

    try {
      if (window.RTCPeerConnection && !tycoonsOriginalRTCPeerConnection) {
        tycoonsOriginalRTCPeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = function patchedTycoonsRTCPeerConnection(...args) {
          const pc = new tycoonsOriginalRTCPeerConnection(...args);
          try { tycoonsElevenPeers.push(pc); } catch (_) {}
          return pc;
        };
        window.RTCPeerConnection.prototype = tycoonsOriginalRTCPeerConnection.prototype;
      }
    } catch (_) {}
  }

  function forceStopTycoonsMedia() {
    try {
      while (tycoonsElevenStreams.length) {
        const stream = tycoonsElevenStreams.pop();
        try { stream.getTracks().forEach((track) => track.stop()); } catch (_) {}
      }
    } catch (_) {}
    try {
      while (tycoonsElevenPeers.length) {
        const pc = tycoonsElevenPeers.pop();
        try { pc.getSenders && pc.getSenders().forEach((s) => s.track && s.track.stop()); } catch (_) {}
        try { pc.getReceivers && pc.getReceivers().forEach((r) => r.track && r.track.stop()); } catch (_) {}
        try { pc.close && pc.close(); } catch (_) {}
      }
    } catch (_) {}
    try {
      document.querySelectorAll('audio,video').forEach((el) => {
        try { el.pause && el.pause(); } catch (_) {}
        try { el.srcObject = null; } catch (_) {}
        try { if (el.dataset && el.dataset.tycoonsTempVoice === 'true') el.remove(); } catch (_) {}
      });
    } catch (_) {}
  }
'''

if 'installTycoonsVoiceCaptures' not in s:
    s = s.replace("\n  async function loadTycoonsElevenSdk() {", capture_helpers + "\n  async function loadTycoonsElevenSdk() {")

# Install capture before asking for mic.
s = s.replace(
    "  async function requestTycoonsMicPermission() {\n    if (!navigator.mediaDevices",
    "  async function requestTycoonsMicPermission() {\n    installTycoonsVoiceCaptures();\n    if (!navigator.mediaDevices"
)

# Make start token-aware so a late start cannot turn UI back on after Stop.
s = s.replace(
    "    tycoonsElevenConnecting = true;\n    tycoonsVoiceDispatch('connecting');",
    "    tycoonsElevenConnecting = true;\n    const startToken = ++tycoonsElevenStartToken;\n    tycoonsVoiceDispatch('connecting');"
)
s = s.replace(
    "          tycoonsElevenConnecting = false;\n          tycoonsElevenActive = true;",
    "          if (startToken !== tycoonsElevenStartToken) { try { await stopTycoonsElevenAgent(); } catch (_) {} return; }\n          tycoonsElevenConnecting = false;\n          tycoonsElevenActive = true;"
)
s = s.replace(
    "      tycoonsElevenActive = true;\n      tycoonsElevenConnecting = false;\n      tycoonsVoiceDispatch('agent');",
    "      if (startToken !== tycoonsElevenStartToken) { await stopTycoonsElevenAgent(); return false; }\n      tycoonsElevenActive = true;\n      tycoonsElevenConnecting = false;\n      tycoonsVoiceDispatch('agent');"
)

# Replace stop body with stronger shutdown.
s = re.sub(
    r"  async function stopTycoonsElevenAgent\(\) \{.*?\n  \}\n\n  async function toggleTycoonsElevenAgent",
    """  async function stopTycoonsElevenAgent() {
    tycoonsElevenStartToken++;
    const conversation = tycoonsElevenConversation;
    tycoonsElevenConversation = null;
    tycoonsElevenActive = false;
    tycoonsElevenConnecting = false;
    tycoonsVoiceDispatch('idle');

    if (conversation) {
      try { if (typeof conversation.setMicMuted === 'function') await conversation.setMicMuted(true); } catch (_) {}
      const methods = ['endSession', 'endConversation', 'disconnect', 'stop', 'close'];
      for (const method of methods) {
        if (typeof conversation[method] === 'function') {
          try { await Promise.race([Promise.resolve(conversation[method]()), new Promise((resolve) => setTimeout(resolve, 700))]); } catch (_) {}
        }
      }
    }

    forceStopTycoonsMedia();
    setTimeout(forceStopTycoonsMedia, 150);
    setTimeout(forceStopTycoonsMedia, 700);
    return true;
  }

  async function toggleTycoonsElevenAgent""",
    s,
    flags=re.S
)
p.write_text(s)

# ---------- Sync React voiceState with SDK events and use toggleAgent directly ----------
p = root / 'asset_5.js'
s = p.read_text()

state_effect = r'''

  useEffect(() => {
    function onVoiceState(e) {
      const state = e && e.detail && e.detail.state;
      if (state === 'agent' || state === 'connecting' || state === 'idle') setVoiceState(state);
      if (state === 'error') setVoiceState('idle');
    }
    window.addEventListener('tycoons:voice-state', onVoiceState);
    return () => window.removeEventListener('tycoons:voice-state', onVoiceState);
  }, []);
'''

if 'tycoons:voice-state' not in s:
    anchor = """  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);"""
    s = s.replace(anchor, anchor + state_effect)

# Replace onMic with reliable toggle: if SDK says active, stop even if React state is stale.
new_onmic = r'''  function onMic() {
    const isSdkActive = !!(window.TC_ELEVEN && typeof window.TC_ELEVEN.isActive === 'function' && window.TC_ELEVEN.isActive());
    if (voiceState === 'listening' || voiceState === 'agent' || voiceState === 'connecting' || isSdkActive) {
      stopListen.current && stopListen.current();
      const stopAgent = (window.TC_ELEVEN && window.TC_ELEVEN.stopAgent) || (window.TC_VOICE && window.TC_VOICE.stopAgent);
      setVoiceState('idle');
      if (typeof stopAgent === 'function') Promise.resolve(stopAgent()).catch(() => {});
      return;
    }
    const startAgent = (window.TC_ELEVEN && window.TC_ELEVEN.startAgent) || (window.TC_VOICE && window.TC_VOICE.startAgent);
    if (typeof startAgent === 'function') {
      setVoiceState('connecting');
      Promise.resolve(startAgent())
        .then(() => { if (window.TC_ELEVEN && window.TC_ELEVEN.isActive && window.TC_ELEVEN.isActive()) setVoiceState('agent'); })
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
print('Tycoons voice stop-toggle hardening patch applied')
