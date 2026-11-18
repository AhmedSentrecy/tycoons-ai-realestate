import { useEffect } from "react";
import { useNavigationType } from "react-router";

/**
 * Starts a page at the top when the visitor moved to it from another page inside the site.
 *
 * A page opened directly (or reached with back/forward) is left where the visitor is: its data
 * arrives after the server-sent page is already on screen and being scrolled, so jumping to the
 * top at that moment throws the visitor back to the start (reported on phones, Nov 2026: the
 * project page returned to the top while the photo walk-through was being scrolled).
 */
export function useScrollTopOnNavigation(pageKey: string) {
  const navigationType = useNavigationType();
  useEffect(() => {
    if (navigationType !== "POP") window.scrollTo(0, 0);
  }, [navigationType, pageKey]);
}
