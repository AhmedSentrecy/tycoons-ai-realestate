/**
 * What the server put in the first HTML response, read once before React touches <head>.
 *
 * The server decides each page's canonical with the full data (for guides: whether the
 * project already has its own written guide). The browser does not load all of that data,
 * so on the page the visitor (or Google) opened directly, the page keeps the server's
 * canonical instead of recomputing a different one (audit SEO-02, Oct 2026: the Zed West
 * visit checklist switched its canonical to the project page after JavaScript).
 */
const normalize = (path: string) => (path.endsWith("/") ? path : `${path}/`);

const snapshot = typeof document === "undefined"
  ? { path: "", canonical: "", html: "" }
  : {
      path: normalize(window.location.pathname),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
      // The page the server sent (text, links, images). Shown while the React page and its data
      // load instead of a "loading…" screen, so visitors and Google never see the content vanish
      // and the main image stays on screen (mobile LCP was 8 s, audit SEO-15, Nov 2026).
      html: document.getElementById("root")?.innerHTML.trim() || "",
    };

/** The server's canonical when `path` is the page that was loaded directly, else "". */
export function serverCanonicalFor(path: string): string {
  return path && snapshot.canonical && normalize(path) === snapshot.path ? snapshot.canonical : "";
}

/** The server-rendered page body when `path` is the page that was loaded directly, else "". */
export function serverHtmlFor(path: string): string {
  return path && snapshot.html && normalize(path) === snapshot.path ? snapshot.html : "";
}
