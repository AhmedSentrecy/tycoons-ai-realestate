import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
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
