import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [react(), cssInjectedByJsPlugin()],
  define: {
    // El build en modo librería (IIFE) no reemplaza esto automáticamente como
    // sí lo hace el modo SPA — sin esto, React referencia `process` en el
    // navegador y explota en runtime con "process is not defined".
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, "src/main.tsx"),
      name: "AokiWidget",
      formats: ["iife"],
      fileName: () => "aoki-widget.js",
    },
  },
});
