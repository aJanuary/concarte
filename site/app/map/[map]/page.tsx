import App from "../../App";
import config from "@/generated/config";
import { eventDescription, previewTitle } from "../../page-meta";
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
  return {
    openGraph: {
      title: previewTitle(config, t, map),
      description: eventDescription(config, t),
    },
  };
}

export default async function Map({
  params,
}: {
  params: Promise<{ map: string }>;
}) {
  const { map } = await params;
  return <App mapId={map} />;
}
