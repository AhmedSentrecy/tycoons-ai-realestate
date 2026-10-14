// Search widget for server-rendered pages (areas, developers, project directory).
// It upgrades every `[data-tycoons-search]` box into the homepage AI search bar with the
// voice agent. Rendered inside a shadow root so the site's Tailwind styles and the
// server page's own CSS never leak into each other. Built to /assets/search-widget.js.
import { StrictMode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import SmartSearchBar from "@/components/SmartSearchBar";
import { VoiceSessionProvider } from "@/contexts/VoiceSessionContext";
import { tr } from "@/lib/homeLanguage";
import css from "@/index.css?inline";

function goToResults(query: string) {
  window.location.assign(`/search?q=${encodeURIComponent(query)}`);
}

function Widget({ placeholder }: { placeholder: string }) {
  // While the voice agent is talking, keep the call alive on this page and offer the results link.
  const [voiceQuery, setVoiceQuery] = useState("");
  const onVoiceSearch = useCallback((query: string) => setVoiceQuery(query), []);
  return (
    <VoiceSessionProvider onSearchNavigate={onVoiceSearch}>
      <SmartSearchBar onSearch={goToResults} placeholder={placeholder} />
      {voiceQuery && (
        <a
          href={`/search?q=${encodeURIComponent(voiceQuery)}`}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#c49b5f] px-5 py-2.5 text-sm font-bold text-white shadow-lg"
        >
          {tr("اعرض النتائج")}: {voiceQuery}
        </a>
      )}
    </VoiceSessionProvider>
  );
}

function mount(host: HTMLElement) {
  if (host.dataset.mounted) return;
  host.dataset.mounted = "1";
  const placeholder = host.dataset.placeholder || "";
  const fallback = host.innerHTML;
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  // Tailwind's :root variables and base rules must target the shadow host instead.
  style.textContent = `${css.replace(/:root\b/g, ":host")}\n:host{display:block;font-family:Alexandria,system-ui,sans-serif;direction:${document.dir || "rtl"};text-align:start}`;
  const container = document.createElement("div");
  shadow.append(style, container);
  try {
    createRoot(container).render(
      <StrictMode>
        <MemoryRouter>
          <Widget placeholder={placeholder} />
        </MemoryRouter>
      </StrictMode>,
    );
  } catch {
    // Keep the server-rendered form if anything goes wrong.
    shadow.innerHTML = fallback;
  }
}

document.querySelectorAll<HTMLElement>("[data-tycoons-search]").forEach(mount);
