import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

// The HTML already holds each page's content (on the homepage: the hero photo and headings).
// Running the app's JavaScript blocks the browser for a while, and when it ran first the photo
// was only painted after it (slow LCP). So the built page downloads the app right away
// (modulepreload) but runs it only once the browser reports the pre-rendered hero photo as
// painted (on pages without that photo: once anything is painted). Removing the photo before
// the browser has counted it would hand "largest element" to the React photo again.
// Safety nets: 0.6 s after the photo loads, 3 s in any case, and at once in a hidden tab
// (it never paints).
const APP_LOADER = (src: string) => `<link rel="modulepreload" crossorigin href="${src}">
    <script data-app-loader>(function(){var done=false;function run(why){if(done)return;done=true;try{var fp=performance.getEntriesByType("paint").map(function(e){return e.name+"="+Math.round(e.startTime)}).join(",");var im=document.querySelector(".ssr-hero>img");console.error("APPLOADER why="+why+" t="+Math.round(performance.now())+" vis="+document.visibilityState+" paints="+fp+" imgComplete="+(im&&im.complete)+" dcl="+document.readyState)}catch(e){}var s=document.createElement("script");s.type="module";s.crossOrigin="";s.src="${src}";document.head.appendChild(s)}try{var L=[];new PerformanceObserver(function(l){l.getEntries().forEach(function(e){var el=e.element;var r=el?el.getBoundingClientRect():null;L.push((el?(el.className||el.tagName):"removed")+"/size"+e.size+"/t"+Math.round(e.startTime)+"/rect"+(r?Math.round(r.width)+"x"+Math.round(r.height)+"@"+Math.round(r.top):"-")+"/win"+innerWidth+"x"+innerHeight)})}).observe({type:"largest-contentful-paint",buffered:true});setTimeout(function(){var pr=document.createElement("div");pr.style.cssText="position:fixed;top:0;left:0;width:1px;height:100svh;visibility:hidden";document.body.appendChild(pr);var svh=pr.getBoundingClientRect().height;var bx=document.querySelector("div[class*=max-h-]");var br=bx?bx.getBoundingClientRect():null;var sec=document.querySelector("section");console.error("APPLCP "+L.join(" ;; ")+" ;; svh100="+svh+" box="+(br?Math.round(br.width)+"x"+br.height:"-")+" section="+(sec?sec.getBoundingClientRect().height:"-")+" dpr="+devicePixelRatio+" win="+innerWidth+"x"+innerHeight)},6000)}catch(e){}function start(){if(document.visibilityState!=="visible"){run("hidden");return}var img=document.querySelector(".ssr-hero>img");try{new PerformanceObserver(function(list){list.getEntries().forEach(function(entry){if(!img||entry.element===img)run("observer")})}).observe({type:img?"largest-contentful-paint":"paint",buffered:true})}catch(e){if(!img)requestAnimationFrame(function(){requestAnimationFrame(function(){setTimeout(function(){run("raf")},100)})})}if(img){var soon=function(){setTimeout(function(){run("soon600")},600)};if(img.complete){soon()}else{img.addEventListener("load",soon,{once:true});img.addEventListener("error",function(){run("imgerror")},{once:true})}}setTimeout(function(){run("timeout3000")},3000)}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",start)}else{start()}})()</script>`

function runAppAfterFirstPaint(): Plugin {
  return {
    name: "run-app-after-first-paint",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const tag = /<script type="module" crossorigin src="(\/assets\/main-[^"]+\.js)"><\/script>/
        if (!tag.test(html)) throw new Error("run-app-after-first-paint: the app's module script was not found in index.html")
        return html.replace(tag, (_match, src: string) => APP_LOADER(src))
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
