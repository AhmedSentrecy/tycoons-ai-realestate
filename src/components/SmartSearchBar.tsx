import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Mic, RefreshCw, Search, Sparkles, X } from "lucide-react";
import SearchResultCard from "@/components/SearchResultCard";
import { usePropertySearch } from "@/hooks/usePropertySearch";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { useTycoonsTts } from "@/hooks/useTycoonsTts";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { inventoryUnitKey } from "@/lib/inventory";
import type { SearchOutput } from "@/lib/propertySearch";
import { openSearchWhatsApp } from "@/lib/whatsapp";

interface Props {
  compact?: boolean;
  onSearchActive?: (active: boolean) => void;
}

export default function SmartSearchBar({ compact = false, onSearchActive }: Props) {
  const { query, setQuery, results, hasSearched, search, clear, inventory } = usePropertySearch();
  const [open, setOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const { speak } = useTycoonsTts();

  const speakFallbackSummary = useCallback(
    (searchResult: SearchOutput | null) => {
      if (!searchResult) {
        void speak("بجهز المخزون العقاري، جرّب كمان لحظة أو اكتب طلبك.", "ar");
        return;
      }
      const best = searchResult.exact[0] ?? searchResult.alternatives[0];
      if (!best) {
        void speak("ملقيتش نتيجة قريبة كفاية. ابعتلنا طلبك على واتساب وهنراجع المخزون كله.", "ar");
        return;
      }
      const exactText = searchResult.totalExact
        ? `لقيت ${searchResult.totalExact.toLocaleString("ar-EG")} اختيار مطابق`
        : "ملقيتش تطابق كامل، بس لقيت بدائل قريبة";
      void speak(
        `${exactText}. أقرب اختيار ${best.unit.unit_type} في ${best.unit.project_name} بسعر يبدأ من ${new Intl.NumberFormat("en-EG").format(best.unit.starting_price)} جنيه.`,
        "ar",
      );
    },
    [speak],
  );

  const onBrowserVoiceText = useCallback(
    (text: string) => {
      const searchResult = search(text);
      setOpen(true);
      speakFallbackSummary(searchResult);
    },
    [search, speakFallbackSummary],
  );

  const onRealtimeSearch = useCallback(
    (text: string) => {
      search(text);
      setOpen(true);
    },
    [search],
  );

  const voice = useVoiceSearch({ onResult: onBrowserVoiceText });
  const realtime = useRealtimeVoice({ onSearchQuery: onRealtimeSearch });

  const realtimeActive = ["connecting", "connected", "listening", "speaking"].includes(realtime.state);
  const listening = voice.state === "listening" || realtime.state === "listening";
  const busyError = realtime.errorMsg || voice.errorMsg;

  const handleMic = async () => {
    setOpen(true);
    if (realtimeActive) {
      realtime.disconnect();
      return;
    }
    if (voice.state === "listening") {
      voice.stop();
      return;
    }

    const connected = await realtime.connect();
    if (!connected) voice.start();
  };

  const submit = () => {
    search();
    setOpen(true);
  };

  useEffect(() => {
    onSearchActive?.(open && hasSearched);
  }, [open, hasSearched, onSearchActive]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const onQuick = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      if (typeof text === "string" && text.trim()) {
        search(text);
        setOpen(true);
      }
    };
    window.addEventListener("tycoons:quick-search", onQuick);
    return () => window.removeEventListener("tycoons:quick-search", onQuick);
  }, [search]);

  const showPanel =
    open &&
    (hasSearched || inventory.loading || listening || realtimeActive || Boolean(busyError) || Boolean(inventory.error));

  const voiceStatus =
    realtime.state === "connecting"
      ? "بنوصل المساعد الصوتي..."
      : realtime.state === "speaking"
        ? "المساعد بيرد عليك..."
        : "بنسمعك... اتكلم دلوقتي";

  return (
    <div ref={boxRef} className="relative w-full">
      <div
        className={`flex items-center gap-3 rounded-2xl bg-white/[0.97] px-4 ${
          compact ? "py-2.5" : "py-3.5"
        } ${listening ? "ring-2 ring-[#c49b5f]/70" : ""}`}
      >
        <Sparkles className="h-5 w-5 shrink-0 text-[#c49b5f]" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!event.target.value.trim()) clear();
          }}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          onFocus={() => hasSearched && setOpen(true)}
          placeholder="عايز شاليه في الساحل أو آي فيلا في التجمع..."
          className="w-full bg-transparent text-[15px] text-[#22312b] outline-none placeholder:text-[#9aa69f]"
        />

        {query && (
          <button
            type="button"
            aria-label="مسح"
            onClick={() => {
              clear();
              setOpen(false);
              setExpandedKey("");
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#9aa69f] transition-colors hover:bg-[#f1ebdc]"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          aria-label="بحث صوتي"
          onClick={handleMic}
          className={`relative grid shrink-0 place-items-center rounded-full border transition-all ${
            compact ? "h-10 w-10" : "h-11 w-11"
          } ${
            listening || realtimeActive
              ? "border-[#c49b5f] bg-[#c49b5f]/15 text-[#a3854e]"
              : "border-[#e5dcc8] text-[#8a7a58] hover:bg-[#f6efe0]"
          }`}
        >
          {(listening || realtime.state === "connecting" || realtime.state === "speaking") && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#c49b5f]/60" />
              <span className="absolute -inset-1 animate-pulse rounded-full bg-[#c49b5f]/20" />
            </>
          )}
          <Mic className={`relative ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={inventory.loading}
          className={`flex shrink-0 items-center gap-2 rounded-full bg-[#14352a] font-semibold text-[#efe3c6] transition-transform hover:scale-[1.04] disabled:cursor-wait disabled:opacity-65 ${
            compact ? "px-5 py-2.5 text-sm" : "px-6 py-3 text-sm"
          }`}
        >
          <Search className="h-4 w-4" />
          ابحث
        </button>
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full z-50 mt-3 overflow-hidden rounded-3xl border border-[#e7ddc8] bg-[#fdfbf6] shadow-[0_35px_90px_-20px_rgba(15,30,22,0.45)]"
          >
            {(listening || realtime.state === "connecting" || realtime.state === "speaking") && (
              <div className="flex items-center gap-3 border-b border-[#efe7d5] bg-[#c49b5f]/8 px-6 py-4">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c49b5f] opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#c49b5f]" />
                </span>
                <span className="text-sm font-semibold text-[#6b5a36]">{voiceStatus}</span>
              </div>
            )}

            {busyError && !listening && realtime.state !== "connecting" && (
              <div className="flex items-center justify-between gap-3 border-b border-[#efe7d5] bg-amber-50 px-6 py-3.5">
                <span className="text-sm text-amber-800">{busyError}</span>
                <button
                  type="button"
                  onClick={handleMic}
                  className="shrink-0 text-sm font-bold text-[#a3854e] underline underline-offset-4"
                >
                  حاول تاني
                </button>
              </div>
            )}

            {inventory.loading && (
              <div className="flex items-center justify-center gap-3 px-6 py-10 text-sm font-semibold text-[#6d7a72]">
                <RefreshCw className="h-4 w-4 animate-spin" /> بنحمّل المخزون المحدث...
              </div>
            )}

            {inventory.error && !inventory.loading && (
              <div className="px-6 py-8 text-center">
                <p className="text-sm font-bold text-[#26352d]">{inventory.error}</p>
                <button
                  type="button"
                  onClick={inventory.refresh}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d8ccb4] px-4 py-2 text-xs font-bold text-[#6b5a36]"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
                </button>
              </div>
            )}

            {hasSearched && !inventory.loading && !inventory.error && (
              <div className="max-h-[560px] overflow-y-auto p-3">
                {results.interpreted && (
                  <div className="px-2 pb-3 pt-1 text-xs font-semibold text-[#92733f]">
                    {results.interpreted}
                  </div>
                )}

                {results.exact.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center justify-between px-2">
                      <h3 className="text-xs font-extrabold text-emerald-800">نتائج مطابقة</h3>
                      <span className="text-[10px] text-[#778179]">
                        أفضل {results.exact.length.toLocaleString("ar-EG")} من {results.totalExact.toLocaleString("ar-EG")}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {results.exact.map((result) => {
                        const key = inventoryUnitKey(result.unit);
                        return (
                          <SearchResultCard
                            key={key}
                            result={result}
                            query={query}
                            expanded={expandedKey === key}
                            onToggle={() => setExpandedKey((current) => (current === key ? "" : key))}
                          />
                        );
                      })}
                    </div>
                  </section>
                )}

                {results.alternatives.length > 0 && (
                  <section className={results.exact.length ? "mt-5" : ""}>
                    <div className="mb-2 px-2">
                      <h3 className="text-xs font-extrabold text-amber-800">
                        {results.exact.length ? "بدائل قريبة" : "مفيش تطابق كامل — دي أقرب بدائل"}
                      </h3>
                    </div>
                    <div className="grid gap-2">
                      {results.alternatives.map((result) => {
                        const key = inventoryUnitKey(result.unit);
                        return (
                          <SearchResultCard
                            key={`alternative-${key}`}
                            result={result}
                            query={query}
                            expanded={expandedKey === key}
                            onToggle={() => setExpandedKey((current) => (current === key ? "" : key))}
                          />
                        );
                      })}
                    </div>
                  </section>
                )}

                {!results.exact.length && !results.alternatives.length && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-[#1b2420]">ملقيناش نتيجة قريبة كفاية</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#6d7a72]">
                      ابعتلنا نفس الطلب على واتساب وهنراجع كل الاختيارات المتاحة يدويًا.
                    </p>
                    <button
                      type="button"
                      onClick={() => openSearchWhatsApp(query)}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1faa59] px-5 py-2.5 text-xs font-bold text-white"
                    >
                      <MessageCircle className="h-4 w-4" /> كمّل على واتساب
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
