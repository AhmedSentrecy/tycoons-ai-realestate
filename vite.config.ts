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
const APP_LOADER = (src: string, chunks: string[]) => `<script data-app-loader>(function(){var done=false;function run(){if(done)return;done=true;${JSON.stringify(chunks)}.forEach(function(href){var l=document.createElement("link");l.rel="modulepreload";l.crossOrigin="";l.href=href;document.head.appendChild(l)});var s=document.createElement("script");s.type="module";s.crossOrigin="";s.src="${src}";document.head.appendChild(s)}function start(){if(document.visibilityState!=="visible"){run();return}var img=document.querySelector("#ssr-hero-photo>img");if(img&&getComputedStyle(img.parentNode).display==="none")img=null;try{new PerformanceObserver(function(list){list.getEntries().forEach(function(entry){if(!img||entry.element===img)run()})}).observe({type:img?"largest-contentful-paint":"paint",buffered:true})}catch(e){if(!img)requestAnimationFrame(function(){requestAnimationFrame(function(){setTimeout(run,100)})})}if(img){var soon=function(){setTimeout(run,600)};if(img.complete){soon()}else{img.addEventListener("load",soon,{once:true});img.addEventListener("error",run,{once:true})}}setTimeout(run,3000)}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",start)}else{start()}})()</script>`

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
