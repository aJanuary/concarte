# Development

The repository is a [pnpm](https://pnpm.io/) workspace of three packages:

- `site/`: the map itself, a Next.js app that is built into static pages for
  one event.
- `editor/`: the editor for an event's config, as a React app that runs in
  Electron.
- `core/`: what both share: the config's types, validation and how room areas
  are read from a map's SVG.

Commands are run from the root of the repository. Install dependencies with:

```bash
pnpm install
```

Most work needs an event to edit. Copy `examples/demo` somewhere outside the
repository and use that, so the editor's saves don't change the example.

## Working on the editor

Run the app from the repository. It rebuilds the bundle on every start and has
no hot reloading, so restart it after each change. Unlike the installed app, it
builds and previews using the repository's own `site/`.

```bash
pnpm editor:app
pnpm editor:app --event /absolute/path/to/event   # skip the start screen
```

To check the packaged result:

```bash
pnpm editor:package --dir   # unpacked app in build/editor-dist
pnpm editor:package         # installer for the current OS
```

## Working on the site

The editor's Preview runs the site's dev server, so with `pnpm editor:app` you
can edit the config in the editor and the site's code side by side and see
both update.

To run the site without the editor, the same dev server is available directly.
It regenerates `site/public/`, `site/generated/` and `site/app/favicon.ico`
from the event whenever the event's files change, so don't edit those.

```bash
CONCARTE_EVENT_DIR=/absolute/path/to/event pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

To check the production build, which the editor's Build command also produces:

```bash
CONCARTE_EVENT_DIR=/absolute/path/to/event pnpm build
```

The output is in `site/out`.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
```
