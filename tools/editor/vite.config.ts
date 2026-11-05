import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import { assetsDir, eventDir, eventName } from "../../scripts/lib/event.ts";
import { editorApi } from "./server/plugin.ts";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  publicDir: false,
  plugins: [
    react(),
    tailwindcss(),
    editorApi({
      eventName,
      eventDir,
      assetsDir,
      root: join(here, "..", ".."),
    }),
  ],
  server: {
    port: 5173,
    // Local only: the API writes to the event's config.
    host: "localhost",
  },
});
