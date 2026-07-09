/* Tycoons site — voice layer.
   Uses the browser Web Speech API for speech-to-text (mic). Text-to-speech
   defaults to a server-side ElevenLabs proxy (keeps the API key off the
   client) with the browser's built-in speechSynthesis as a fallback if the
   proxy is unreachable or errors.

   tts-proxy contract: POST { text, voice_id, model_id } -> raw audio/mpeg
   stream (not JSON). voice_id/model_id are fixed constants below. */
(function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  const TTS_PROXY_URL = 'https://coqnjymekrkoausiiytm.supabase.co/functions/v1/tts-proxy';

  function sttSupported() { return !!SR; }
  function ttsSupported() { return !!synth; }

  function langCode(lang) { return lang === 'ar' ? 'ar-EG' : 'en-US'; }

  // ---- Speech to text ----
  // opts: { lang, onInterim(text), onFinal(text), onStart, onEnd, onError }
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

  // ---- Text to speech ----
  let customSpeaker = null;
  function setSpeaker(fn) { customSpeaker = fn; }

  function pickVoice(lang) {
    if (!synth) return null;
    const voices = synth.getVoices() || [];
    const want = lang === 'ar' ? 'ar' : 'en';
    return voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(want)) || null;
  }

  // Browser speechSynthesis — used directly, and as the fallback when the
  // ElevenLabs proxy call fails.
  function browserSpeak(text, lang, onEnd) {
    if (!synth) { onEnd && onEnd(); return; }
    try { synth.cancel(); } catch (_) {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langCode(lang);
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.rate = lang === 'ar' ? 0.98 : 1.02;
    u.pitch = 1;
    u.onend = () => onEnd && onEnd();
    u.onerror = () => onEnd && onEnd();
    if (!synth.getVoices().length) {
      synth.onvoiceschanged = () => { const vv = pickVoice(lang); if (vv) u.voice = vv; synth.speak(u); synth.onvoiceschanged = null; };
    } else {
      synth.speak(u);
    }
  }

  let currentAudio = null;
  const EL_VOICE_ID = '9SPZl4Mlgwj7QT4gVprb';
  const EL_MODEL_ID = 'eleven_multilingual_v2';
  async function elevenLabsSpeak(text, lang) {
    const res = await fetch(TTS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id: EL_VOICE_ID, model_id: EL_MODEL_ID }),
    });
    if (!res.ok) throw new Error('tts-proxy ' + res.status);
    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      currentAudio = audio;
      audio.onended = resolve;
      audio.onerror = () => reject(new Error('audio playback failed'));
      audio.play().catch(reject);
    });
  }

  function speak(text, lang, onEnd) {
    if (currentAudio) { try { currentAudio.pause(); } catch (_) {} currentAudio = null; }
    if (customSpeaker) {
      Promise.resolve(customSpeaker(text, lang)).then(() => onEnd && onEnd()).catch(() => onEnd && onEnd());
      return;
    }
    elevenLabsSpeak(text, lang).then(() => onEnd && onEnd()).catch((err) => {
      console.warn('[Tycoons] ElevenLabs TTS failed, falling back to browser voice:', err.message);
      browserSpeak(text, lang, onEnd);
    });
  }

  function stopSpeaking() {
    if (currentAudio) { try { currentAudio.pause(); } catch (_) {} currentAudio = null; }
    try { synth && synth.cancel(); } catch (_) {}
  }

  window.TC_VOICE = { sttSupported, ttsSupported, listen, speak, stopSpeaking, setSpeaker };
})();
