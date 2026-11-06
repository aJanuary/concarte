import { join, resolve } from "path";
import type { Plugin } from "vite";
import { createApi } from "./api.ts";
import { createEditorHost } from "./editor-host.ts";

type Options = {
  root: string;
};

/** Serves the editor API from the Vite dev server, for editing in a browser. */
export function editorApi(options: Options): Plugin {
  const { root } = options;

  return {
    name: "concarte-editor-api",
    // The editor must never exist outside the dev server.
    apply: "serve",
    async configureServer(server) {
      // Read here rather than at import: the config is also loaded to build
      // the packaged app, which has no event.
      const configured = process.env.CONCARTE_EVENT_DIR;
      if (!configured) {
        throw new Error(
          "CONCARTE_EVENT_DIR must be set to the event folder to edit.",
        );
      }
      const eventDir = resolve(configured);
      const host = createEditorHost({
        messagesDir: join(root, "app", "messages"),
        relativeTo: root,
      });
      await host.open(eventDir);
      const handle = createApi(host);
      server.middlewares.use(async (req, res, next) => {
        if (!(await handle(req, res))) {
          next();
        }
      });
      server.httpServer?.on("close", () => void host.close());
    },
  };
}
