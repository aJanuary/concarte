import { readFileSync } from "fs";
import { join, resolve } from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./app/i18n/request.ts");

// Read here rather than from generated files because Next needs it before
// anything is compiled. `pnpm generate` has already validated the config.
function eventBasePath() {
  const eventDir = process.env.CONCARTE_EVENT_DIR;
  if (!eventDir) {
    return "";
  }
  try {
    const config = JSON.parse(
      readFileSync(join(resolve(eventDir), "concarte.json"), "utf8"),
    );
    return config.basePath ?? "";
  } catch {
    return "";
  }
}

const basePath = eventBasePath();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // Shipped as TypeScript source rather than built.
  transpilePackages: ["@concarte/core"],
  experimental: {
    // The editor runs the build in Electron acting as Node. Turbopack's
    // default runs PostCSS in a `node` it finds on PATH; the editor supplies
    // one except on Windows, where only a real node.exe would be found.
    // Worker threads need no `node`, but can abort the process on macOS
    // (nodejs/node#65100), so they are used on Windows alone. Forced because
    // Next otherwise falls back to child processes on Electron's Node.
    ...(process.versions.electron &&
      process.platform === "win32" && {
        turbopackPluginRuntimeStrategy: "forceWorkerThreads",
      }),
  },
};

export default withNextIntl(nextConfig);
