import { existsSync, readFileSync, statSync } from "fs";
import type { IncomingMessage, ServerResponse } from "http";
import { extname, join, normalize, sep } from "path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function candidates(root: string, pathname: string): string[] {
  const full = normalize(join(root, decodeURIComponent(pathname)));
  if (full !== root && !full.startsWith(root + sep)) {
    return [];
  }
  // Next's export writes /about as about.html
  return [full, `${full}.html`, join(full, "index.html")];
}

/** Serves a folder of Next's static export. */
export function staticHandler(root: string) {
  return (req: IncomingMessage, res: ServerResponse) => {
    let file: string | undefined;
    try {
      const { pathname } = new URL(req.url ?? "/", "http://localhost");
      file = candidates(root, pathname).find(
        (c) => existsSync(c) && statSync(c).isFile(),
      );
    } catch {
      // malformed URL: falls through to 404
    }
    if (!file) {
      const notFound = join(root, "404.html");
      res.statusCode = 404;
      res.setHeader("Content-Type", MIME[".html"]);
      res.end(existsSync(notFound) ? readFileSync(notFound) : "Not found");
      return;
    }
    res.setHeader(
      "Content-Type",
      MIME[extname(file).toLowerCase()] ?? "application/octet-stream",
    );
    res.end(readFileSync(file));
  };
}
