/* Tycoons site — voice compatibility layer.
   OpenAI Realtime owns all live voice input/output.
   This file keeps the legacy browser speech-recognition contract only so the
   existing UI does not break. No ElevenLabs or external TTS call remains. */
(function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  function sttSupported() { return !!SR; }
  function ttsSupported() { return true; }
  function langCode(lang) { return lang === 'ar' ? 'ar-EG' : 'en-US'; }

  function listen(opts) {
    if (!SR) { opts.onError && opts.onError('unsupported'); return () => {}; }
    const rec = new SR();
    rec.lang = langCode(opts.lang);
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onstart = () => opts.onStart && opts.onStart();
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      if (interim) opts.onInterim && opts.onInterim((finalText + ' ' + interim).trim());
      if (finalText) opts.onFinal && opts.onFinal(finalText.trim());
    };
    rec.onerror = (e) => opts.onError && opts.onError(e.error || 'error');
    rec.onend = () => opts.onEnd && opts.onEnd(finalText.trim());
    try { rec.start(); } catch (_) {}
    return () => { try { rec.stop(); } catch (_) {} };
  }

  let customSpeaker = null;
  function setSpeaker(fn) { customSpeaker = typeof fn === 'function' ? fn : null; }

  function speak(text, lang, onEnd) {
    // Prevent any legacy second voice while OpenAI Realtime is active.
    if (window.TC_OPENAI && typeof window.TC_OPENAI.isActive === 'function' && window.TC_OPENAI.isActive()) {
      onEnd && onEnd();
      return;
    }
    if (customSpeaker) {
      Promise.resolve(customSpeaker(text, lang))
        .then(() => onEnd && onEnd())
        .catch(() => onEnd && onEnd());
      return;
    }
    // Legacy text-to-speech is intentionally disabled. OpenAI Realtime is the
    // only voice output provider for the website.
    onEnd && onEnd();
  }

  function stopSpeaking() {
    try { synth && synth.cancel(); } catch (_) {}
  }

  window.TC_VOICE = { sttSupported, ttsSupported, listen, speak, stopSpeaking, setSpeaker };
})();