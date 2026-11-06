import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import { editorApi } from "./server/plugin.ts";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  publicDir: false,
  plugins: [
    react(),
    tailwindcss(),
    editorApi({ root: join(here, "..", "..") }),
  ],
  server: {
    port: 5173,
    // Local only: the API writes to the event's config.
    host: "localhost",
  },
});
