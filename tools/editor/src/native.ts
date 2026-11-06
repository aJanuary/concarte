import type { MenuAction, NativeResult } from "../shared/native";

export function runMenuAction(action: MenuAction): Promise<NativeResult> {
  const native = window.concarte;
  if (!native) {
    return Promise.resolve({
      ok: false,
      message: "Opening events needs the ConCarte app",
    });
  }
  switch (action.type) {
    case "new":
      return native.newEvent();
    case "open":
      return native.openEvent();
    case "open-recent":
      return native.openEvent(action.path);
  }
}
