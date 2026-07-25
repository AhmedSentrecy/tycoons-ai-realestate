import { useCallback, useEffect, useRef } from "react";

/**
 * TTS بنفس بنية موقع تايكونز الحالي:
 * - ElevenLabs عبر Supabase proxy (المفتاح متخزن سيرفر-سايد)
 * - نفس الـ voice_id والـ model_id المستخدمين في الإنتاج
 * - fallback لـ speechSynthesis بتاع المتصفح لو البروكسي وقع
 */

const TTS_PROXY_URL =
  "https://coqnjymekrkoausiiytm.supabase.co/functions/v1/tts-proxy";
const EL_VOICE_ID = "9SPZl4Mlgwj7QT4gVprb";
const EL_MODEL_ID = "eleven_multilingual_v2";

function langCode(lang: "ar" | "en") {
  return lang === "ar" ? "ar-EG" : "en-US";
}

export function useTycoonsTts() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => stopSpeaking, [stopSpeaking]);

  const browserSpeak = useCallback(
    (text: string, lang: "ar" | "en"): Promise<void> =>
      new Promise((resolve) => {
        const synth = window.speechSynthesis;
        if (!synth) return resolve();
        try {
          synth.cancel();
        } catch {
          /* ignore */
        }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = langCode(lang);
        const pick = () =>
          (synth.getVoices() || []).find(
            (v) => v.lang && v.lang.toLowerCase().startsWith(lang)
          ) || null;
        const v = pick();
        if (v) u.voice = v;
        u.rate = lang === "ar" ? 0.98 : 1.02;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        if (!synth.getVoices().length) {
          synth.onvoiceschanged = () => {
            const vv = pick();
            if (vv) u.voice = vv;
            synth.speak(u);
            synth.onvoiceschanged = null;
          };
        } else {
          synth.speak(u);
        }
      }),
    []
  );

  const elevenLabsSpeak = useCallback(
    async (text: string, lang: "ar" | "en") => {
      const res = await fetch(TTS_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_id: EL_VOICE_ID,
          model_id: EL_MODEL_ID,
          lang: langCode(lang),
        }),
      });
      if (!res.ok) throw new Error(`tts-proxy ${res.status}`);
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => reject(new Error("audio playback failed"));
        audio.play().catch(reject);
      });
    },
    []
  );

  /** يتكلم النص — ElevenLabs أولًا، وبعدين المتصفح لو فشل */
  const speak = useCallback(
    async (text: string, lang: "ar" | "en" = "ar") => {
      stopSpeaking();
      try {
        await elevenLabsSpeak(text, lang);
      } catch {
        // fallback صامت زي الموقع الحالي
        await browserSpeak(text, lang);
      }
    },
    [elevenLabsSpeak, browserSpeak, stopSpeaking]
  );

  return { speak, stopSpeaking };
}
