import react from "@vitejs/plugin-react";
import macros from "unplugin-parcel-macros";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import { editorApi } from "./server/plugin.ts";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  publicDir: false,
  plugins: [
    // Must run before react(): it compiles the Spectrum style() macros.
    macros.vite(),
    react(),
    editorApi({ root: join(here, "..", "..") }),
  ],
  // The repo's PostCSS config runs Tailwind for the site; the editor has none.
  css: { postcss: { plugins: [] } },
  optimizeDeps: {
    // A build-time macro, compiled away by the macros plugin; the browser
    // never loads it, and it only resolves under Node.
    exclude: ["@react-spectrum/s2/style"],
  },
  build: {
    rollupOptions: {
      output: {
        // One chunk for Spectrum's atomic CSS, so classes aren't duplicated
        // across chunks.
        manualChunks(id) {
          if (
            /macro-(.*)\.css$/.test(id) ||
            /@react-spectrum\/s2\/.*\.css$/.test(id)
          ) {
            return "s2-styles";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    // Local only: the API writes to the event's config.
    host: "localhost",
  },
});
