import type { ReactNode } from "react";

/**
 * A glass panel that holds one homepage section over the sky. The section keeps its own layout;
 * its own background is switched off (see .sky-panel in index.css) so the panel shows instead.
 */
export default function SkyPanel({ id, tone = "light", children, className = "" }: { id: string; tone?: "light" | "dark"; children: ReactNode; className?: string }) {
  return (
    <div id={id} data-sky-zone={id} className={`mx-auto max-w-[1200px] px-2.5 py-2.5 sm:px-4 sm:py-3 ${className}`}>
      <div
        className={`sky-panel overflow-hidden rounded-[26px] backdrop-blur-xl ${
          tone === "dark"
            ? "border border-white/10 bg-[#060f1c]/70 shadow-[0_30px_70px_-40px_rgba(6,15,28,0.9)]"
            : "bg-white/[0.84] shadow-[0_30px_70px_-40px_rgba(6,15,28,0.6)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
