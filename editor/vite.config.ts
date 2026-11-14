import { dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  publicDir: false,
});
