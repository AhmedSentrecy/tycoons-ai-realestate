import type { ReactNode } from "react";

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-black ${active ? "bg-[#060f1c] text-white" : "bg-[#eef2f7] text-[#0f1724]"}`}
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
        active ? "border-[#b47c17] text-[#0f1724]" : "border-transparent text-[#556070]"
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
    muted: "bg-[#eef2f7] text-[#556070]",
    gold: "bg-[#f0bd4f] text-[#060f1c]",
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
          <button onClick={onClose} aria-label="إغلاق" className="rounded-full bg-[#f4f6fa] px-3 py-1 text-sm font-black">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-[#e3e9f2] bg-[#f7f9fc] px-3 py-2 text-sm outline-none focus:border-[#b47c17]";

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="grid min-h-60 place-items-center rounded-3xl border border-dashed border-[#c9d3e1] bg-white/60 p-8 text-center">
      <div>
        <p className="text-xl font-black">{title}</p>
        {text && <p className="mt-2 text-sm text-[#556070]">{text}</p>}
      </div>
    </div>
  );
}
