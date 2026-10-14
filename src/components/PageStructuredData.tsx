import { useEffect } from "react";

/** Replace the build-time page graph only when the client has its real page data. */
export default function PageStructuredData({ value }: { value: unknown }) {
  const json = JSON.stringify(value).replace(/</g, "\\u003c");
  useEffect(() => {
    const id = "tycoons-page-schema";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = json;
    script.dataset.renderSource = "react";
    return () => { script?.remove(); };
  }, [json]);
  return null;
}
