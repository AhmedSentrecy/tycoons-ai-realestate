import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { Mic, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useInventory } from "@/lib/inventory";
import { useVoiceSession } from "@/contexts/VoiceSessionContext";

interface Props {
  compact?: boolean;
  initialQuery?: string;
}

const WEBMCP_FORM_ATTRS = {
  toolname: "search_properties_form",
  tooldescription:
    "Searches available Egyptian real-estate inventory on Tycoons Investments from a free-text description of what the buyer wants — unit type, area or compound, budget, payment plan and delivery date.",
} as Record<string, string>;

const WEBMCP_QUERY_ATTRS = {
  toolparamdescription:
    "Free-text description of the desired property, in Egyptian Arabic or English. Example: 'شاليه في الساحل تحت 10 مليون'.",
} as Record<string, string>;

export default function SmartSearchBar({ compact = false, initialQuery = "" }: Props) {
  const navigate = useNavigate();
  const inventory = useInventory();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  const openResults = useCallback((value: string) => {
    const clean = value.trim();
    if (clean) navigate(`/search?q=${encodeURIComponent(clean)}`);
  }, [navigate]);

  const onBrowserVoiceText = useCallback((text: string) => {
    setQuery(text);
    openResults(text);
  }, [openResults]);

  const voice = useVoiceSearch({ onResult: onBrowserVoiceText });
  const realtime = useVoiceSession();
  const realtimeActive = realtime.active;
  const listening = voice.state === "listening" || realtime.state === "listening";
  const busyError = realtime.errorMsg || voice.errorMsg;

  const handleMic = async () => {
    if (realtimeActive) {
      return;
    }
    if (voice.state === "listening") {
      voice.stop();
      return;
    }
    const connected = await realtime.connect();
    if (!connected) voice.start();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openResults(query);
  };

  useEffect(() => {
    const onQuick = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      if (typeof text === "string" && text.trim()) {
        setQuery(text);
        openResults(text);
      }
    };
    window.addEventListener("tycoons:quick-search", onQuick);
    return () => window.removeEventListener("tycoons:quick-search", onQuick);
  }, [openResults]);

  const voiceStatus = realtime.state === "connecting"
    ? "بنوصل المساعد الصوتي..."
    : realtime.state === "speaking"
      ? "المساعد بيرد عليك..."
      : "بنسمعك... اتكلم دلوقتي";

  return (
    <div className="w-full">
      <form
        role="search"
        onSubmit={onSubmit}
        aria-label="البحث في الوحدات العقارية المتاحة"
        {...WEBMCP_FORM_ATTRS}
        className={`flex items-center gap-2 rounded-2xl border border-white/25 bg-white px-3 shadow-[0_18px_55px_-24px_rgba(7,25,17,0.5)] sm:gap-3 sm:px-4 ${
          compact ? "py-2.5" : "py-3.5"
        } ${listening ? "ring-2 ring-[#c49b5f]/70" : ""}`}
      >
        <Sparkles aria-hidden="true" className="hidden h-5 w-5 shrink-0 text-[#c49b5f] sm:block" />
        <input
          type="text"
          name="query"
          id={compact ? "tycoons-search-query-page" : "tycoons-search-query"}
          enterKeyHint="search"
          autoComplete="off"
          aria-label="اكتب طلبك: نوع الوحدة والمنطقة والميزانية"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="مثال: شقة في التجمع تحت 10 مليون ومقدم 5%"
          {...WEBMCP_QUERY_ATTRS}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[#22312b] outline-none placeholder:text-[#8c9891] sm:text-[15px]"
        />

        {query && (
          <button type="button" aria-label="مسح البحث" onClick={() => setQuery("")} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#8c9891] transition-colors hover:bg-[#f1ebdc]">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          aria-label="بحث صوتي"
          aria-pressed={listening || realtimeActive}
          onClick={handleMic}
          className={`relative grid shrink-0 place-items-center rounded-full border transition-all ${compact ? "h-10 w-10" : "h-11 w-11"} ${
            listening || realtimeActive
              ? "border-[#c49b5f] bg-[#c49b5f]/15 text-[#a3854e]"
              : "border-[#e5dcc8] text-[#8a7a58] hover:bg-[#f6efe0]"
          }`}
        >
          {(listening || realtime.state === "connecting" || realtime.state === "speaking") && (
            <span className="absolute -inset-1 animate-pulse rounded-full bg-[#c49b5f]/20" />
          )}
          <Mic aria-hidden="true" className={`relative ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
        </button>

        <button
          type="submit"
          disabled={inventory.loading || !query.trim()}
          aria-label="اعرض نتائج البحث"
          className={`flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#14352a] font-semibold text-[#efe3c6] transition-all hover:bg-[#1d4839] disabled:cursor-not-allowed disabled:opacity-50 ${
            compact ? "h-10 px-4 sm:px-5" : "h-11 px-4 sm:h-auto sm:px-6 sm:py-3"
          }`}
        >
          {inventory.loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className={compact ? "hidden sm:inline" : "hidden min-[390px]:inline"}>اعرض النتائج</span>
        </button>
      </form>

      {(listening || realtime.state === "connecting" || realtime.state === "speaking") && (
        <p className="mt-2 px-2 text-xs font-semibold text-[#d9b87c]">{voiceStatus}</p>
      )}
      {busyError && !listening && realtime.state !== "connecting" && (
        <p className="mt-2 px-2 text-xs font-semibold text-amber-700">{busyError}</p>
      )}
    </div>
  );
}
