import { useEffect } from "react";

/**
 * Puts the day-to-night sky (public/site-sky.js) behind this page while it is on screen.
 * Mark the page's <main> (or root element) with data-sky-page so its sections sit on light
 * panels over the sky (see "Inner pages over the sky" in index.css).
 */
export function useSiteSky() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-sky", "on");
    return () => root.removeAttribute("data-sky");
  }, []);
}
