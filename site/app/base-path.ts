const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prefixes a root-relative path with the site's base path. Only needed for
 * URLs Next doesn't handle itself: `<Link>` and the router already add it.
 */
export function withBasePath(path: string): string {
  return basePath + path;
}
