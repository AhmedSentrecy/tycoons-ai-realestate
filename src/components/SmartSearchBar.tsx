import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Search, Sparkles, X, MapPin, ArrowLeft } from "lucide-react";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { useTycoonsTts } from "@/hooks/useTycoonsTts";
import { usePropertySearch, searchResultsFor } from "@/hooks/usePropertySearch";
import { regions } from "@/data/content";

interface Props {
  compact?: boolean; // نسخة الشريط العائم
  onSearchActive?: (active: boolean) => void;
}

export default function SmartSearchBar({ compact = false, onSearchActive }: Props) {
  const { query, setQuery, results, hasSearched, search, clear } = usePropertySearch();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const tts = useTycoonsTts();

  const onVoiceText = (text: string) => {
    search(text);
    setOpen(true);
    // رد صوتي بنفس صوت الموقع الحالي (ElevenLabs) بعد ظهور النتايج
    const { projects: found } = searchResultsFor(text);
    const countWord =
      found.length === 1
        ? "وحدة واحدة"
        : found.length === 2
          ? "وحدتين"
          : `${found.length.toLocaleString("ar-EG")} وحدات`;
    const reply = found.length
      ? `لقيتلك ${countWord} مناسبة — أقرب واحدة لطلبك ${found[0].type} في ${found[0].location} بسعر ${found[0].price}.`
      : "ملقيتش نتيجة مطابقة بالظبط — جرّب توسّع البحث، أو كلمنا على واتساب والمساعد هيدوّرلك في المخزون كله.";
    tts.speak(reply, "ar");
  };

  // Fallback: تحويل الكلام لنص بالمتصفح
  const voice = useVoiceSearch({ onResult: onVoiceText });

  // المسار الأساسي: OpenAI Realtime API (WebRTC) — نفس الموقع الحالي
  const realtime = useRealtimeVoice({ onSearchQuery: onVoiceText });

  const realtimeActive =
    realtime.state === "connecting" ||
    realtime.state === "connected" ||
    realtime.state === "listening" ||
    realtime.state === "speaking";

  const handleMic = async () => {
    setOpen(true);

    // لو فيه جلسة Realtime شغالة — اقفلها
    if (realtimeActive) {
      realtime.disconnect();
      return;
    }
    // لو الـ fallback بيسمع — اقفله
    if (voice.state === "listening") {
      voice.stop();
      return;
    }

    // جرّب Realtime الأول — لو مش متاح، ارجع لـ Web Speech API
    const ok = await realtime.connect();
    if (!ok && realtime.state === "unavailable") {
      voice.start();
    }
  };

  const listening = voice.state === "listening" || realtime.state === "listening";
  const busyError = realtime.errorMsg || voice.errorMsg;

  useEffect(() => {
    onSearchActive?.(open && hasSearched);
  }, [open, hasSearched, onSearchActive]);

  // قفل النتائج عند الضغط برّه
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // الأزرار المقترحة (chips) بتبعت حدث بحث سريع
  useEffect(() => {
    const onQuick = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (typeof text === "string" && text.trim()) {
        search(text);
        setOpen(true);
      }
    };
    window.addEventListener("tycoons:quick-search", onQuick);
    return () => window.removeEventListener("tycoons:quick-search", onQuick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    search();
    setOpen(true);
  };

  const showPanel =
    open &&
    (hasSearched || listening || realtimeActive || Boolean(busyError));

  // لو كل حاجة قفلت ومفيش بحث ولا خطأ — اقفل اللوحة
  useEffect(() => {
    if (
      !hasSearched &&
      voice.state === "idle" &&
      !voice.errorMsg &&
      (realtime.state === "idle" || realtime.state === "unavailable") &&
      !realtime.errorMsg
    )
      setOpen(false);
  }, [voice.state, voice.errorMsg, realtime.state, realtime.errorMsg, hasSearched]);

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
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) clear();
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          onFocus={() => hasSearched && setOpen(true)}
          placeholder="عايز شاليه في الساحل أو آي فيلا في التجمع..."
          className="w-full bg-transparent text-[15px] text-[#22312b] outline-none placeholder:text-[#9aa69f]"
        />

        {query && (
          <button
            aria-label="مسح"
            onClick={() => {
              clear();
              setOpen(false);
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#9aa69f] transition-colors hover:bg-[#f1ebdc]"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* زرار المايك */}
        <button
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
              <span className="absolute inset-0 rounded-full border-2 border-[#c49b5f]/60 animate-ping" />
              <span className="absolute -inset-1 rounded-full bg-[#c49b5f]/20 animate-pulse" />
            </>
          )}
          <Mic className={`relative ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
        </button>

        <button
          onClick={submit}
          className={`flex shrink-0 items-center gap-2 rounded-full bg-[#14352a] font-semibold text-[#efe3c6] transition-transform hover:scale-[1.04] ${
            compact ? "px-5 py-2.5 text-sm" : "px-6 py-3 text-sm"
          }`}
        >
          <Search className="h-4 w-4" />
          ابحث
        </button>
      </div>

      {/* لوحة النتائج */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full z-50 mt-3 overflow-hidden rounded-3xl border border-[#e7ddc8] bg-[#fdfbf6] shadow-[0_35px_90px_-20px_rgba(15,30,22,0.45)]"
          >
            {/* حالة الاستماع */}
            {(listening || realtime.state === "connecting" || realtime.state === "speaking") && (
              <div className="flex items-center gap-3 border-b border-[#efe7d5] bg-[#c49b5f]/8 px-6 py-4">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c49b5f] opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#c49b5f]" />
                </span>
                <span className="text-sm font-semibold text-[#6b5a36]">
                  بنسمعك... اتكلم دلوقتي
                </span>
              </div>
            )}

            {/* رسالة خطأ الصوت */}
            {busyError && !listening && realtime.state !== "connecting" && (
              <div className="flex items-center justify-between gap-3 border-b border-[#efe7d5] bg-amber-50 px-6 py-3.5">
                <span className="text-sm text-amber-800">{busyError}</span>
                <button
                  onClick={handleMic}
                  className="shrink-0 text-sm font-bold text-[#a3854e] underline underline-offset-4"
                >
                  حاول تاني
                </button>
              </div>
            )}

            {hasSearched && (
              <div className="max-h-[380px] overflow-y-auto p-3">
                {results.interpreted && (
                  <div className="px-3 pb-2 pt-1 text-xs font-medium text-[#a3854e]">
                    {results.interpreted}
                  </div>
                )}

                {results.projects.length > 0 ? (
                  results.projects.map((p) => (
                    <a
                      key={p.id}
                      href={`https://wa.me/201200704344?text=${encodeURIComponent(
                        `مهتم بـ ${p.title} — ${p.location}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-4 rounded-2xl p-2.5 transition-colors hover:bg-[#f4efe2]"
                    >
                      <img
                        src={p.image}
                        alt={p.title}
                        className="h-14 w-20 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-[#1b2420]">
                          {p.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#6d7a72]">
                          <MapPin className="h-3 w-3" />
                          {p.location} · {p.type}
                        </div>
                      </div>
                      <div className="shrink-0 text-left">
                        <div className="text-sm font-extrabold text-[#a3854e]">{p.price}</div>
                        <div className="mt-0.5 text-[10px] text-[#6d7a72]">{p.delivery}</div>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-[#1b2420]">
                      ملقيناش نتيجة مطابقة بالظبط
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#6d7a72]">
                      جرّب توسّع البحث (مثال: «شاليه في الساحل») — أو ابعتلنا على واتساب
                      والمساعد هيدوّرلك في المخزون كله.
                    </p>
                    <a
                      href={`https://wa.me/201200704344?text=${encodeURIComponent(query)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1faa59] px-5 py-2.5 text-xs font-bold text-white"
                    >
                      كمّل على واتساب
                    </a>
                  </div>
                )}

                {/* لينك صفحة المنطقة */}
                {results.regionSlug && (
                  <Link
                    to={`/regions/${results.regionSlug}`}
                    onClick={() => setOpen(false)}
                    className="group mt-1 flex items-center justify-between rounded-2xl bg-[#14352a]/5 px-5 py-3.5 transition-colors hover:bg-[#14352a]/10"
                  >
                    <span className="text-sm font-semibold text-[#14352a]">
                      صفحة {regions.find((r) => r.slug === results.regionSlug)?.name} الكاملة
                      — أسعار ومطورين وأسئلة
                    </span>
                    <ArrowLeft className="h-4 w-4 text-[#a3854e] transition-transform group-hover:-translate-x-1" />
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
