/// <reference types="vite/client" />
import type { Bridge } from "../shared/bridge";

declare global {
  interface Window {
    concarte: Bridge;
  }
}
