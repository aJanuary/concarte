import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["{core,site,editor}/**/*.test.ts"],
    exclude: ["**/node_modules/**"],
  },
});
