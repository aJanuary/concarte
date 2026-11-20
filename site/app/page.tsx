import App from "./App";
import config from "@/generated/config";
import { maps, size } from "@/generated/preview-images";
import {
  eventDescription,
  eventTitle,
  previewImageAlt,
  previewMetadata,
} from "./page-meta";
import { pageTranslator } from "./page-translator";

export async function generateMetadata() {
  const t = await pageTranslator();
  const map =
    config.maps.find((m) => m.id === config.defaultMap) ?? config.maps[0];
  return previewMetadata(config, {
    title: eventTitle(config, t),
    description: eventDescription(config, t),
    path: "",
    image: map && {
      file: maps[map.id],
      ...size,
      alt: previewImageAlt(t, map),
    },
  });
}

export default function Index() {
  return <App />;
}
