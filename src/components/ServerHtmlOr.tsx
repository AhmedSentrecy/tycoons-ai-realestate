import type { ReactNode } from "react";
import { serverHtmlFor } from "@/lib/ssrSnapshot";

/**
 * While a page's code or data is loading, keep showing what the server already sent for this URL
 * (same text, links and images) instead of a blank "loading…" screen. Falls back to `children`
 * when the visitor navigated here inside the app (no server copy for this URL).
 */
export default function ServerHtmlOr({ children }: { children: ReactNode }) {
  const html = typeof window === "undefined" ? "" : serverHtmlFor(window.location.pathname);
  if (!html) return <>{children}</>;
  return <div data-server-html="" dangerouslySetInnerHTML={{ __html: html }} />;
}
