import type { ReactNode } from "react";

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-black ${active ? "bg-[#0d1f18] text-white" : "bg-[#f1eadc] text-[#1b2420]"}`}
    >
      {children}
    </button>
  );
}

export function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px whitespace-nowrap rounded-t-xl border-b-2 px-4 py-2 text-sm font-black ${
        active ? "border-[#a3854e] text-[#1b2420]" : "border-transparent text-[#5c6a62]"
      }`}
    >
      {children}
    </button>
  );
}

export function Badge({ tone, children }: { tone: "pending" | "ok" | "error" | "muted" | "gold"; children: ReactNode }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    ok: "bg-emerald-50 text-emerald-700",
    error: "bg-red-50 text-red-600",
    muted: "bg-[#f1eadc] text-[#5c6a62]",
    gold: "bg-[#d9b87c] text-[#0d1f18]",
  } as const;
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-black ${styles[tone]}`}>{children}</span>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-3" onClick={onClose}>
      <div
        dir="rtl"
        role="dialog"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white p-5 ${wide ? "max-w-5xl" : "max-w-lg"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">{title}</h2>
          <button onClick={onClose} aria-label="إغلاق" className="rounded-full bg-[#f7f2ea] px-3 py-1 text-sm font-black">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-[#e7ddc8] bg-[#fbf8f2] px-3 py-2 text-sm outline-none focus:border-[#a3854e]";

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="grid min-h-60 place-items-center rounded-3xl border border-dashed border-[#d8c9ab] bg-white/60 p-8 text-center">
      <div>
        <p className="text-xl font-black">{title}</p>
        {text && <p className="mt-2 text-sm text-[#5c6a62]">{text}</p>}
      </div>
    </div>
  );
}
