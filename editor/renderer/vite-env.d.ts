/// <reference types="vite/client" />
import type { Bridge } from "../shared/bridge";
import type { BuildInfo } from "../shared/build-info";

declare global {
  interface Window {
    concarte: Bridge;
  }
  /** Substituted by the build script. */
  const __BUILD_INFO__: BuildInfo;
}
