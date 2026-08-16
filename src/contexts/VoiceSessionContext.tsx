import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Mic, PhoneOff, Volume2, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";

type VoiceSessionValue = ReturnType<typeof useRealtimeVoice> & { active: boolean };
const VoiceSessionContext = createContext<VoiceSessionValue | null>(null);

export function useVoiceSession() {
  const value = useContext(VoiceSessionContext);
  if (!value) throw new Error("useVoiceSession must be used inside VoiceSessionProvider");
  return value;
}

export function VoiceSessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [confirmEnd, setConfirmEnd] = useState(false);

  const onSearchQuery = useCallback((text: string) => {
    const clean = text.trim();
    if (clean) navigate(`/search?q=${encodeURIComponent(clean)}`);
    return { search_request: clean, destination: "/search" };
  }, [navigate]);

  const voice = useRealtimeVoice({ onSearchQuery });
  const active = ["connecting", "connected", "listening", "speaking"].includes(voice.state);
  const endSession = useCallback(() => {
    voice.disconnect();
    setConfirmEnd(false);
  }, [voice]);
  const value = useMemo(() => ({ ...voice, active }), [voice, active]);

  const status = voice.state === "connecting"
    ? "جاري توصيل المساعد الصوتي"
    : voice.state === "speaking"
      ? "المساعد بيرد عليك"
      : voice.state === "listening"
        ? "بنسمعك… اتكلم دلوقتي"
        : "المحادثة الصوتية مستمرة";

  return (
    <VoiceSessionContext.Provider value={value}>
      {children}
      {active && (
        <aside aria-label="المحادثة الصوتية" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[90] mx-auto max-w-2xl rounded-2xl border border-[#d6b77d]/45 bg-[#102d25]/95 p-3 text-white shadow-[0_18px_60px_rgba(3,17,12,0.42)] backdrop-blur-xl sm:inset-x-6 sm:p-4">
          {confirmEnd ? (
            <div role="dialog" aria-label="تأكيد إنهاء المحادثة" className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold">إنهاء المحادثة الصوتية وإيقاف الميكروفون؟</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setConfirmEnd(false)} className="rounded-full border border-white/25 px-4 py-2 text-xs font-bold hover:bg-white/10">رجوع</button>
                <button type="button" onClick={endSession} className="flex items-center gap-2 rounded-full bg-[#b64b43] px-4 py-2 text-xs font-bold hover:bg-[#c65a51]">
                  <PhoneOff aria-hidden="true" className="h-4 w-4" /> إنهاء
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#d6b77d]/15 text-[#e7c98f]">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#d6b77d]/10" />
                {voice.state === "speaking" ? <Volume2 aria-hidden="true" className="relative h-5 w-5" /> : <Mic aria-hidden="true" className="relative h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-[#d6b77d]">مساعد Tycoons الصوتي</p>
                <p className="truncate text-sm font-bold">{status}</p>
                {voice.transcript && <p className="mt-0.5 truncate text-xs text-white/65">{voice.transcript}</p>}
              </div>
              <button type="button" onClick={() => setConfirmEnd(true)} className="hidden items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-bold transition-colors hover:border-[#d6b77d]/60 hover:bg-white/10 sm:flex">
                <PhoneOff aria-hidden="true" className="h-4 w-4" /> إنهاء المحادثة
              </button>
              <button type="button" aria-label="إنهاء المحادثة الصوتية" onClick={() => setConfirmEnd(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 text-white/80 hover:bg-white/10">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          )}
        </aside>
      )}
    </VoiceSessionContext.Provider>
  );
}
