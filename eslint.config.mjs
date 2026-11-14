import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";

const nextRules = nextCoreWebVitals
  .flatMap((config) => Object.keys(config.rules ?? {}))
  .filter((rule) => rule.startsWith("@next/next/"));

// The editor's layers: each folder may not import from the ones listed
// against it, so dependencies only point one way. Each process's code stays
// in its own folder: the page (renderer) reaches the main process only
// through the bridge whose contract is in shared. The main process's service
// is plain Node, so it can be tested without Electron.
const editorLayers = {
  shared: ["renderer", "main", "preload"],
  main: ["renderer", "preload"],
  "main/service": ["renderer", "preload", "electron"],
  preload: ["renderer", "main"],
  renderer: ["main", "preload", "electron"],
  "renderer/ui": ["platform", "svg", "document", "editor", "shell"],
  "renderer/platform": ["ui", "svg", "document", "editor", "shell"],
  "renderer/svg": ["ui", "document", "editor", "shell"],
  "renderer/document": ["ui", "svg", "editor", "shell"],
  "renderer/editor": ["shell"],
};

const parentOf = (layer) => layer.slice(0, layer.lastIndexOf("/"));

const editorLayerRules = Object.entries(editorLayers).map(
  ([layer, forbidden]) => ({
    files: [`editor/${layer}/**`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Each layer's rule replaces its parent's, so repeat those.
              group: [
                ...new Set([
                  ...forbidden,
                  ...(editorLayers[parentOf(layer)] ?? []),
                ]),
              ]
                // Electron is a package; everything else is a folder.
                .map((name) => (name === "electron" ? name : `**/${name}/**`)),
              message: `editor/${layer} must not depend on this.`,
            },
          ],
        },
      ],
    },
  }),
);

const eslintConfig = [
  {
    ignores: ["**/.next/**", "site/out/**", "build/**", "**/node_modules/**"],
  },
  ...nextCoreWebVitals,
  {
    settings: {
      next: { rootDir: "site/" },
      // Detection looks for React beside this file, where there is none.
      react: { version: "19" },
    },
  },
  {
    // The shared React and TypeScript rules apply everywhere, but Next's own
    // describe a Next app, which only the site is.
    ignores: ["site/**"],
    rules: Object.fromEntries(nextRules.map((rule) => [rule, "off"])),
  },
  ...editorLayerRules,
  prettier,
];

export default eslintConfig;
