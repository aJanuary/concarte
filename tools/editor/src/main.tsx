import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SettingsDialog } from "./SettingsDialog";
import "@react-spectrum/s2/page.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className={style({ font: "ui", height: "full" })}>
      <App />
      <SettingsDialog />
    </div>
  </StrictMode>,
);
