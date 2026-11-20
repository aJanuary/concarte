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

## Making a map

Each convention's map is described by an _event_: a folder holding a
`concarte.json` and an `assets/` folder with the map images. You edit it with
the ConCarte editor, a desktop app for Linux (AppImage), macOS (dmg) and
Windows (installer). Download the installer for your system from the
[releases page](https://github.com/aJanuary/concarte/releases). The installers
are unsigned, so macOS and Windows warn about an unidentified developer the
first time you open it.

1. **New event** picks an empty folder and writes a minimal event into it. To
   edit an existing event, use **Open event** and pick its folder.
2. **Add map** (in the structure panel) copies an SVG into the event's
   `assets/` folder. Room boundaries are shapes in the SVG with an `id`
   attribute.
3. Select shapes or groups in the map or the tree to make them rooms, and edit
   the event, maps, overlays and rooms in the panel. Changes save
   automatically to `concarte.json`.
4. **Preview** runs the site locally and opens it in your browser, updating as
   you edit.
5. **Build** produces the static site in `<event>/dist/`.

Build needs no Node or pnpm on the machine, but the site loads its fonts from
Google, so it needs a network connection.

Saving rewrites the whole of `concarte.json`: comments are not preserved and
rooms are ordered as their elements appear in the SVG. A room inside a room
group is therefore drawn above it and wins clicks on its own area.

`--event <folder>` opens a folder when the app launches.

### The event folder

```
<event>/
  concarte.json   # see core/config.types.ts for documentation of the options
  assets/         # maps, overlays and favicon.ico
  dist/           # the built site
```

`examples/demo` is a working example. The editor is the usual way to change
`concarte.json`, but it is plain JSON and can be edited by hand. Paths in it
such as `"src": "/ground.svg"` are relative to the event's `assets/` directory.
Maps and overlays must be SVGs; each room names the `id` of its shape.

## Hosting

The built site is static pages that any static file server can host. It does
require the URLs to be rewritten to remove the `.html` extension.

Set **Site address** in the event settings (the `url` field in `concarte.json`)
to the address the site will be served at, such as `https://example.com`, and
rebuild. Link previews use it to give each page's full address.

### Example nginx config

```nginx
server {
  listen 80;
  server_name example.com;

  root /var/www/dist;

  location / {
    try_files $uri $uri.html $uri/ =404;
  }

  error_page 404 /404.html;
  location = /404.html {
    internal;
  }
}
```

### Hosting under a subpath

To serve the map somewhere other than the root of a domain, include the path
in **Site address**, such as `https://example.com/myevent`. Every page, asset
and link in the built site then starts with `/myevent`, including links in
markdown that start with `/`.

The built site must then be served at that path. One way with nginx is to put
the contents of `dist/` in a folder named after the path:

```nginx
server {
  listen 80;
  server_name example.com;

  # The contents of dist/ are in /var/www/myevent
  root /var/www;
  # Redirect /myevent to /myevent/ without naming a host, which the site's own
  # navigation can't follow if it differs from the page's
  absolute_redirect off;

  location /myevent {
    try_files $uri $uri.html $uri/ =404;
  }

  error_page 404 /myevent/404.html;
  location = /myevent/404.html {
    internal;
  }
}
```

## Contributing

We welcome contributions to the project.
See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for more information, and
[DEVELOPMENT.md](./docs/DEVELOPMENT.md) for how to run the project from a
checkout.
