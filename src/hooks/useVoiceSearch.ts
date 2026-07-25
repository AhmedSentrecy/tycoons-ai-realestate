import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "error" | "unsupported";

interface VoiceSearchOptions {
  onResult: (transcript: string) => void;
  lang?: string;
}

// واجهات المتصفح — مش موجودة في كل الأنواع
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function useVoiceSearch({ onResult, lang = "ar-EG" }: VoiceSearchOptions) {
  const [state, setState] = useState<VoiceState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef<any>(null);
  const supported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // تجاهل — بعض المتصفحات بترمي خطأ لو مش شغال أصلًا
    }
  }, []);

  const start = useCallback(() => {
    // البحث الصوتي بالمتصفح محتاج HTTPS (localhost مسموح)
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setState("unsupported");
      setErrorMsg("البحث الصوتي محتاج موقع آمن (HTTPS)");
      return;
    }
    if (!supported) {
      setState("unsupported");
      setErrorMsg("متصفحك مش بيدعم البحث الصوتي — جرّب كروم");
      return;
    }

    // لو فيه جلسة قديمة شغالة، اقفلها الأول
    stop();

    try {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new Ctor();
      recognitionRef.current = rec;

      rec.lang = lang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;

      rec.onstart = () => {
        setState("listening");
        setErrorMsg("");
      };

      rec.onresult = (e: any) => {
        const transcript = e?.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          onResult(transcript);
        } else {
          setErrorMsg("مسمعناش حاجة — جرّب تاني");
        }
        setState("idle");
      };

      rec.onerror = (e: any) => {
        setState("error");
        switch (e?.error) {
          case "not-allowed":
          case "service-not-allowed":
            setErrorMsg("اسمح بالمايكروفون من إعدادات المتصفح الأول");
            break;
          case "no-speech":
            setErrorMsg("مسمعناش صوت — اتكلم بوضوح وحاول تاني");
            break;
          case "audio-capture":
            setErrorMsg("مفيش مايكروفون متاح على الجهاز");
            break;
          case "network":
            setErrorMsg("مشكلة في الاتصال — البحث الصوتي محتاج إنترنت");
            break;
          default:
            setErrorMsg("حصلت مشكلة — جرّب الكتابة بدل الصوت");
        }
      };

      rec.onend = () => {
        setState((s) => (s === "listening" ? "idle" : s));
      };

      rec.start();
    } catch {
      setState("error");
      setErrorMsg("البحث الصوتي مش متاح دلوقتي — جرّب الكتابة");
    }
  }, [supported, lang, onResult, stop]);

  // تنضيف عند إغلاق الصفحة
  useEffect(() => {
    return () => stop();
  }, [stop]);

  // إخفاء رسالة الخطأ تلقائيًا بعد ٦ ثواني
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => {
      setErrorMsg("");
      setState("idle");
    }, 6000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  return { state, errorMsg, start, stop, supported };
}
