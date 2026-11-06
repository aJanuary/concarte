# ConCarte

ConCarte lets you turn a static images of your venue map into an interactive map
that can be panned, zoomed and searched.

It is designed for use at small to medium sized conventions.

## Features

- **Interactive map**: Users can pan and zoom the map.
- **Search**: Users can search for rooms and booths.
- **Customizable**: You can customize the map with your own images and data.
- **Open source**: The project is open source and free to use.
- **Self-hosted**: You can host the map on your own server.
- **Static pages**: The output is static pages, making it easy to host.
- **No tracking**: The map does not track users.
- **No dependencies**: The map does not depend on any third-party services.
- **No ads**: The map does not show ads.

### Roadmap

We don't have an official roadmap, as we are a small team working on this
as a side project. However, we would like to add the following features:

- **Responsive**: The map works on desktop and mobile devices.
- **Accessible**: The map is accessible to screen readers and keyboard users.
- **Offline support**: The map works offline after the first visit.

## Conventions using ConCarte

- [LAcon V (Worldcon 2026)](https://map.lacon.org/)
- [Eastercon 2026](https://map.eastercon2026.org/)
- [Gaelcon 37](https://gaelcon37.conmaps.com/)
- [Gamecon 2025](https://gamecon2025.conmaps.com/)
- [Eastercon 2025](https://map.easterconbelfast.org/)
- [AthventureCon III](https://athventurecon3.conmaps.com/)
- [Warpcon 35](https://warpcon35.conmaps.com/)
- [Dragonmeet 2024](https://dragonmeet2024.conmaps.com/)
- [Octocon 2024](https://map.octocon.com/)
- [Gaelcon 36](https://gaelcon.lostcarpark.com/)

## Building

### Setup

Install dependencies using [pnpm](https://pnpm.io/):

```bash
pnpm install
```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the
result.

### Production

Run the production build:

```bash
pnpm build
```

The output will be in the `out` directory. This can be hosted on any static file
server. It does require the URLs to be rewritten to remove the `.html`
extension.

#### Example nginx config

```nginx
server {
  listen 80;
  server_name example.com;

  root /var/www/out;

  location / {
    try_files $uri $uri.html $uri/ =404;
  }

  error_page 404 /404.html;
  location = /404.html {
    internal;
  }
}
```

## Configuring

Everything specific to a convention lives in its own folder, which can be
anywhere on disk:

```
<event>/
  concarte.json   # see app/config.types.ts for documentation of the options
  assets/     # maps, overlays and favicon.ico
```

`examples/demo` is a working example. Select the folder with the
`CONCARTE_EVENT_DIR` environment variable, which `pnpm dev` and `pnpm build`
require:

```bash
CONCARTE_EVENT_DIR=/absolute/path/to/event pnpm dev
CONCARTE_EVENT_DIR=/absolute/path/to/event pnpm build
```

Paths in `concarte.json` such as `src: "/ground.png"` are relative to the event's
`assets/` directory. The `public/` directory and `app/favicon.ico` are generated
from it, so don't edit them directly.

### Map editor

An editor for an event's `concarte.json`. It works with SVG maps whose rooms are
defined as `area: { ref }`.

#### The app

The editor is packaged as a desktop app for Linux (AppImage), macOS (dmg) and
Windows (installer), built by the `Package editor` workflow when a `v*` tag is
pushed. The installers are unsigned, so macOS and Windows warn about an
unidentified developer the first time they open it.

- **New event** picks an empty folder and writes a minimal event into it.
- **Open event** picks a folder that contains a `concarte.json`. Only open events you
  trust: the config is code, and the editor and Build both run it.
- **Add map** (in the structure panel) copies an SVG into the event's `assets/`
  folder.
- **Build** produces the static site in `<event>/dist/`. It needs no Node or pnpm
  on the machine, but the site loads its fonts from Google, so it needs a
  network connection. **Preview** serves `dist/` locally and opens it in your
  browser.

`--event <folder>` opens a folder at launch.

To run or package the app from a checkout:

```bash
pnpm editor:app                # build and run
pnpm editor:package            # installer for the current OS in build/editor-dist
pnpm editor:package --dir      # unpacked app only, for testing
```

#### In a browser

For working on the editor itself there is a development server with hot
reloading. It edits one event, chosen with `CONCARTE_EVENT_DIR`, and has no Build
or Preview.

```bash
CONCARTE_EVENT_DIR=/absolute/path/to/event pnpm editor
```

Open [http://localhost:5173](http://localhost:5173). Select shapes or groups
in the map or the tree to make them rooms, and edit the event, maps, overlays
and rooms in the panel. Changes save automatically to the event's `concarte.json`.

Saving rewrites the whole file: comments are not preserved and rooms are ordered
as their elements appear in the SVG. A room inside a room group is therefore
drawn above it and wins clicks on its own area.

The editor is never part of `pnpm build`.

## Contributing

We welcome contributions to the project.
See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for more information.
