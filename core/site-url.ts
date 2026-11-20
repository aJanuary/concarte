/**
 * Where the site is served, from a config's `url`. `origin` is undefined when
 * only a path is given, and `basePath` is empty at the root of the domain.
 */
export type SiteUrl = { origin: string | undefined; basePath: string };

export type ParsedSiteUrl =
  ({ ok: true } & SiteUrl) | { ok: false; problem: string };

const BASE_PATH = /^(\/[A-Za-z0-9._~-]+)*$/;

function withPath(
  origin: string | undefined,
  path: string,
  url: string,
): ParsedSiteUrl {
  const basePath = path.replace(/\/+$/, "");
  if (!BASE_PATH.test(basePath)) {
    return {
      ok: false,
      problem: `The path of the site address "${url}" must use only letters, digits, ".", "_", "~" and "-" between single slashes`,
    };
  }
  return { ok: true, origin, basePath };
}

/** Reads a config's `url`, which may be a full URL or only a path. */
export function parseSiteUrl(url: string | undefined): ParsedSiteUrl {
  if (url === undefined || url === "") {
    return { ok: true, origin: undefined, basePath: "" };
  }
  if (url.startsWith("/")) {
    return withPath(undefined, url, url);
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      ok: false,
      problem: `The site address "${url}" must be a full address starting with https://, or a path starting with /`,
    };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      ok: false,
      problem: `The site address "${url}" must start with https:// or http://`,
    };
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    return {
      ok: false,
      problem: `The site address "${url}" can't include a user name, password, "?" or "#"`,
    };
  }
  return withPath(parsed.origin, parsed.pathname, url);
}
