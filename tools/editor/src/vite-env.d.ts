/// <reference types="vite/client" />
import type { ConcarteNative } from "../shared/native";

declare global {
  interface Window {
    /** Only present in the packaged app. */
    concarte?: ConcarteNative;
  }
}
