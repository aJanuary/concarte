import react from "@vitejs/plugin-react";
import macros from "unplugin-parcel-macros";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  publicDir: false,
  plugins: [
    // Must run before react(): it compiles the Spectrum style() macros.
    macros.vite(),
    react(),
  ],
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
});
