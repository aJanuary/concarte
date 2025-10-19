import App from "../../App";
import config from "../../config";

export function generateStaticParams() {
  return config.maps.map((map) => {
    return { map: map.id };
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
