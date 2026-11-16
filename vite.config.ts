import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

// The HTML already holds each page's content (on the homepage: the hero photo and headings).
// Running the app's JavaScript blocks the browser for a while, and when it ran first the photo
// was only painted after it (slow LCP). On a slow connection the app's files (about 500 KB)
// also took bandwidth from the hero photo. So the built page fetches and runs the app only
// once the browser reports the pre-rendered hero photo as painted (on pages without that
// photo: once anything is painted). The photo itself stays in
// the page for good (it sits outside #root, see index.html).
// Safety nets: 0.6 s after the photo loads, 3 s in any case, and at once in a hidden tab
// (it never paints).
const APP_LOADER = (src: string, chunks: string[]) => `<script data-app-loader>(function(){var done=false;function run(){if(done)return;done=true;${JSON.stringify(chunks)}.forEach(function(href){var l=document.createElement("link");l.rel="modulepreload";l.crossOrigin="";l.href=href;document.head.appendChild(l)});var s=document.createElement("script");s.type="module";s.crossOrigin="";s.src="${src}";document.head.appendChild(s)}try{var T0=[],LF=[],LC=[],WHY="";new PerformanceObserver(function(l){l.getEntries().forEach(function(e){T0.push(Math.round(e.startTime)+"+"+Math.round(e.duration))})}).observe({type:"longtask",buffered:true});try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){LF.push(Math.round(e.startTime)+"+"+Math.round(e.duration)+"[blk"+Math.round(e.blockingDuration)+" render"+Math.round(e.renderStart)+" style"+Math.round(e.styleAndLayoutStart)+" "+(e.scripts||[]).map(function(s){return (s.sourceURL||"").split("/").pop().split("?")[0].slice(0,24)+":"+s.invokerType+":"+Math.round(s.duration)}).join(",")+"]")})}).observe({type:"long-animation-frame",buffered:true})}catch(e){}new PerformanceObserver(function(l){l.getEntries().forEach(function(e){LC.push((e.element?e.element.tagName:"x")+"@"+Math.round(e.startTime)+"(load"+Math.round(e.loadTime)+",render"+Math.round(e.renderTime)+")")})}).observe({type:"largest-contentful-paint",buffered:true});var _run=run;run=function(){if(!WHY)WHY="run@"+Math.round(performance.now());_run()};setTimeout(function(){var n=performance.getEntriesByType("navigation")[0]||{};var rs=performance.getEntriesByType("resource").filter(function(r){return r.startTime<3500}).map(function(r){return r.name.split("/").pop().split("?")[0].slice(0,22)+" "+Math.round(r.startTime)+"-"+Math.round(r.responseEnd)+(r.renderBlockingStatus==="blocking"?" RB":"")}).join(" | ");console.error("APPDBG paints "+performance.getEntriesByType("paint").map(function(e){return e.name.replace("first-","")+" "+Math.round(e.startTime)}).join(",")+" ;; nav resp"+Math.round(n.responseEnd)+" interactive"+Math.round(n.domInteractive)+" dcl"+Math.round(n.domContentLoadedEventStart)+"-"+Math.round(n.domContentLoadedEventEnd)+" load"+Math.round(n.loadEventStart)+" ;; "+WHY+" ;; lcp "+LC.join(" ")+" ;; longtasks "+T0.join(" ")+" ;; loaf "+LF.join(" ")+" ;; res "+rs)},7000)}catch(e){}function start(){if(document.visibilityState!=="visible"){run();return}var img=document.querySelector("#ssr-hero-photo>img");if(img&&getComputedStyle(img.parentNode).display==="none")img=null;try{new PerformanceObserver(function(list){list.getEntries().forEach(function(entry){if(!img||entry.element===img)run()})}).observe({type:img?"largest-contentful-paint":"paint",buffered:true})}catch(e){if(!img)requestAnimationFrame(function(){requestAnimationFrame(function(){setTimeout(run,100)})})}if(img){var soon=function(){setTimeout(run,600)};if(img.complete){soon()}else{img.addEventListener("load",soon,{once:true});img.addEventListener("error",run,{once:true})}}setTimeout(run,3000)}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",start)}else{start()}})()</script>`

function runAppAfterFirstPaint(): Plugin {
  return {
    name: "run-app-after-first-paint",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const tag = /<script type="module" crossorigin src="(\/assets\/main-[^"]+\.js)"><\/script>/
        if (!tag.test(html)) throw new Error("run-app-after-first-paint: the app's module script was not found in index.html")
        // The app's other files are fetched only when it starts, not next to the hero photo.
        const chunks: string[] = []
        const withoutPreloads = html.replace(/[ \t]*<link rel="modulepreload" crossorigin href="([^"]+)">\r?\n?/g, (_match, href: string) => {
          chunks.push(href)
          return ""
        })
        return withoutPreloads.replace(tag, (_match, src: string) => APP_LOADER(src, chunks))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react(), runAppAfterFirstPaint()],
  build: {
    cssCodeSplit: true,
    commonjsOptions: { include: [/node_modules/, /_(?:article-render|project-schema|unit-url)\.cjs$/] },
    sourcemap: false,
    rollupOptions: {
      // A second entry: the AI search + voice widget for server-rendered pages, at a
      // stable URL (/widget/search-widget.js, outside the long-cached /assets/ folder) that the Netlify functions can reference.
      input: {
        main: path.resolve(__dirname, "index.html"),
        "search-widget": path.resolve(__dirname, "src/widget/searchWidget.tsx"),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === "search-widget" ? "widget/search-widget.js" : "assets/[name]-[hash].js"),
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|react-router)\//.test(id)) return "react-vendor";
          if (id.includes("node_modules/framer-motion/")) return "motion";
          if (id.includes("node_modules/lucide-react/")) return "icons";
          if (/node_modules\/(@radix-ui|embla-carousel|vaul|cmdk)\//.test(id)) return "ui-vendor";
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
