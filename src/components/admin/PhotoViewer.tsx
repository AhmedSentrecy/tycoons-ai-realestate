import { useEffect, useState, type ReactNode } from "react";

/**
 * Big photo viewer: the photo fills the screen (dark background), ← → or the arrows go to the next photo,
 * Esc or ✕ closes, a click on the photo shows it at full size (scroll to read small text).
 * With onToggle, «شيلها / رجّعها» decides the photo right here; actions adds other buttons for the photo shown
 * (the photos tab: «اجعلها الغلاف», «شيل»).
 */
export default function PhotoViewer({
  title,
  urls,
  index,
  onIndex,
  onClose,
  isOff,
  onToggle,
  actions,
}: {
  title: string;
  urls: string[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  isOff?: (url: string) => boolean;
  onToggle?: (url: string) => void;
  actions?: (url: string, index: number) => ReactNode;
}) {
  const [full, setFull] = useState(false);
  const url = urls[index];
  const go = (step: number) => {
    setFull(false);
    onIndex((index + step + urls.length) % urls.length);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      // The admin is right-to-left: ← is the next photo, → the previous one.
      if (event.key === "ArrowLeft") go(1);
      if (event.key === "ArrowRight") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!url) return null;
  const off = isOff?.(url) ?? false;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white" onClick={onClose}>
      <div
        className="flex flex-wrap items-center gap-2 p-3 text-sm [&>a]:whitespace-nowrap [&>button]:whitespace-nowrap"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="me-auto min-w-0 basis-full truncate font-black sm:basis-auto">
          {title} · صورة {index + 1} من {urls.length}
          {off && <span className="ms-2 rounded-full bg-red-600 px-2 py-0.5 text-xs">مش هتتضاف</span>}
          <span className="block text-xs font-normal text-white/70">دوس على الصورة تكبر لحجمها الحقيقي</span>
        </span>
        {actions?.(url, index)}
        {onToggle && (
          <button onClick={() => onToggle(url)} className={`rounded-full px-3 py-1.5 font-black ${off ? "bg-emerald-600" : "bg-red-600"}`}>
            {off ? "رجّعها" : "شيلها"}
          </button>
        )}
        <a href={url} target="_blank" rel="noreferrer" className="rounded-full bg-white/15 px-3 py-1.5 font-black">
          افتحها في تابة
        </a>
        <button onClick={onClose} className="rounded-full bg-white/15 px-3 py-1.5 font-black" title="اقفل (Esc)">
          ✕
        </button>
      </div>
      <div className={`relative min-h-0 flex-1 ${full ? "overflow-auto" : "grid place-items-center overflow-hidden"} px-1 pb-4 sm:px-12`}>
        <img
          src={url}
          alt=""
          onClick={(event) => {
            event.stopPropagation();
            setFull((value) => !value);
          }}
          className={full ? "max-w-none cursor-zoom-out" : `max-h-full max-w-full cursor-zoom-in object-contain ${off ? "opacity-40" : ""}`}
          title={full ? "صغّرها" : "كبّرها للحجم الحقيقي"}
        />
      </div>
      {urls.length > 1 && (
        <>
          <button
            onClick={(event) => {
              event.stopPropagation();
              go(-1);
            }}
            className="fixed right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-2xl font-black"
            title="اللي قبلها"
          >
            ›
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              go(1);
            }}
            className="fixed left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-2xl font-black"
            title="اللي بعدها"
          >
            ‹
          </button>
        </>
      )}
    </div>
  );
}
