import { parseSiteUrl, type Config, type Map, type Room } from "@concarte/core";
import type { Nodes } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Metadata } from "next";

/** The `page` messages, as `createTranslator` or `useTranslations` give them. */
export type PageTranslator = (
  key: "title" | "description" | "named" | "map-image" | "room-image",
  values: Record<string, string>,
) => string;

const DESCRIPTION_LENGTH = 200;

export function eventTitle(config: Config, t: PageTranslator): string {
  return config.page?.title ?? t("title", { eventName: config.eventName });
}

export function eventDescription(config: Config, t: PageTranslator): string {
  return (
    config.page?.description ??
    t("description", { eventName: config.eventName })
  );
}

/**
 * The link preview title of a map's or room's page. With one map, its name
 * only repeats what the event title says.
 */
export function previewTitle(
  config: Config,
  t: PageTranslator,
  map: Pick<Map, "label">,
  room?: Pick<Room, "label">,
): string {
  const name = room?.label ?? (config.maps.length > 1 ? map.label : undefined);
  return named(config, t, name);
}

/**
 * The alt text of a map's link preview image, or of a room's, which shows the
 * room outlined on its map.
 */
export function previewImageAlt(
  t: PageTranslator,
  map: Pick<Map, "label">,
  room?: Pick<Room, "label">,
): string {
  return room
    ? t("room-image", { room: room.label, map: map.label })
    : t("map-image", { map: map.label });
}

/** The event title, with `name` in front of it when there is one. */
export function named(
  config: Config,
  t: PageTranslator,
  name: string | undefined,
): string {
  const title = eventTitle(config, t);
  return name ? t("named", { name, title }) : title;
}

/**
 * The full address of the page at `path` ("" for the home page), or undefined
 * when the config's `url` doesn't name the domain.
 */
export function pageUrl(
  config: Pick<Config, "url">,
  path: string,
): string | undefined {
  const siteUrl = parseSiteUrl(config.url);
  if (!siteUrl.ok || !siteUrl.origin) {
    return undefined;
  }
  return siteUrl.origin + (siteUrl.basePath + path || "/");
}

/** A link preview image, `file` being undefined when there is none. */
export type PreviewImage = {
  file: string | undefined;
  width: number;
  height: number;
  alt: string;
};

/**
 * The link preview metadata of the page at `path` ("" for the home page).
 * Addresses and the image are left out when the config's `url` doesn't name
 * the domain, since other sites can't follow a partial address.
 */
export function previewMetadata(
  config: Pick<Config, "url">,
  {
    title,
    description,
    path,
    image,
  }: {
    title: string;
    description: string;
    path: string;
    image?: PreviewImage;
  },
): Metadata {
  const imageUrl = image?.file && pageUrl(config, image.file);
  return {
    openGraph: {
      title,
      description,
      url: pageUrl(config, path),
      ...(image &&
        imageUrl && {
          images: [
            {
              url: imageUrl,
              width: image.width,
              height: image.height,
              alt: image.alt,
            },
          ],
        }),
    },
    ...(imageUrl && { twitter: { card: "summary_large_image" } }),
  };
}

/** The link preview description of a room's page: its own, or else the
 * event's. */
export function roomPreviewDescription(
  config: Config,
  t: PageTranslator,
  room: Pick<Room, "description">,
): string {
  return (
    (room.description && summary(room.description)) ||
    eventDescription(config, t)
  );
}

function plainText(node: Nodes): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
      return node.value;
    case "break":
      return " ";
    case "image":
    case "html":
      return "";
    default:
      return "children" in node ? node.children.map(plainText).join("") : "";
  }
}

function firstParagraph(node: Nodes): string | undefined {
  if (node.type === "paragraph") {
    const text = plainText(node).replace(/\s+/g, " ").trim();
    return text || undefined;
  }
  if ("children" in node) {
    for (const child of node.children) {
      const text = firstParagraph(child);
      if (text) {
        return text;
      }
    }
  }
  return undefined;
}

/**
 * The first paragraph of some markdown as plain text, short enough for a link
 * preview. Undefined when there is no paragraph with text.
 */
export function summary(markdown: string): string | undefined {
  const text = firstParagraph(fromMarkdown(markdown));
  if (!text || text.length <= DESCRIPTION_LENGTH) {
    return text;
  }
  const cut = text.slice(0, DESCRIPTION_LENGTH);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s.,;:]+$/, "")}…`;
}
