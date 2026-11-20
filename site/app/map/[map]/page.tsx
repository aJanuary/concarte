import App from "../../App";
import config from "@/generated/config";
import { maps, size } from "@/generated/preview-images";
import {
  eventDescription,
  previewImageAlt,
  previewMetadata,
  previewTitle,
} from "../../page-meta";
import { pageTranslator } from "../../page-translator";

export function generateStaticParams() {
  return config.maps.map((map) => {
    return { map: map.id };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ map: string }>;
}) {
  const { map: mapId } = await params;
  const map = config.maps.find((m) => m.id === mapId);
  if (!map) {
    return {};
  }
  const t = await pageTranslator();
  return previewMetadata(config, {
    title: previewTitle(config, t, map),
    description: eventDescription(config, t),
    path: `/map/${map.id}`,
    image: { file: maps[map.id], ...size, alt: previewImageAlt(t, map) },
  });
}

export default async function Map({
  params,
}: {
  params: Promise<{ map: string }>;
}) {
  const { map } = await params;
  return <App mapId={map} />;
}
