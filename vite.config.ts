import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    cssCodeSplit: true,
    commonjsOptions: { include: [/node_modules/, /_(?:article-render|project-schema|unit-url)\.cjs$/] },
    sourcemap: false,
    rollupOptions: {
      // A second entry: the AI search + voice widget for server-rendered pages, at a
      // stable URL (/assets/search-widget.js) that the Netlify functions can reference.
      input: {
        main: path.resolve(__dirname, "index.html"),
        "search-widget": path.resolve(__dirname, "src/widget/searchWidget.tsx"),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === "search-widget" ? "assets/search-widget.js" : "assets/[name]-[hash].js"),
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
