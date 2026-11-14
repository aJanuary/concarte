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
anywhere on your machine:

```
<event>/
  concarte.json   # see core/config.types.ts for documentation of the options
  assets/         # maps, overlays and favicon.ico
```

`examples/demo` is a working example. To create your own, copy it somewhere
outside the repository and select it with the `CONCARTE_EVENT_DIR` environment
variable:

```bash
CONCARTE_EVENT_DIR=/absolute/path/to/event pnpm dev
CONCARTE_EVENT_DIR=/absolute/path/to/event pnpm build
```

Paths in `concarte.json` such as `"src": "/ground.svg"` are relative to the
event's `assets/` folder. `site/public/`, `site/generated/` and
`site/app/favicon.ico` are generated from the event, so don't edit them
directly. Only the assets the config refers to are published.

## Contributing

We welcome contributions to the project.
See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for more information.
