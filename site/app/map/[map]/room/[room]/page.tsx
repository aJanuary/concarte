import { notFound } from "next/navigation";
import App from "../../../../App";
import config from "@/generated/config";
import { rooms, size } from "@/generated/preview-images";
import {
  previewImageAlt,
  previewMetadata,
  previewTitle,
  roomPreviewDescription,
} from "../../../../page-meta";
import { pageTranslator } from "../../../../page-translator";

// A static export fails on a dynamic route with no pages, which a map whose
// rooms aren't drawn yet would be; this stands in and renders a 404.
const PLACEHOLDER = { map: "-", room: "-" };

export async function generateStaticParams() {
  const params = config.maps.flatMap((map) =>
    map.rooms.map((room) => ({
      map: map.id,
      room: room.id,
    })),
  );
  return params.length > 0 ? params : [PLACEHOLDER];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ map: string; room: string }>;
}) {
  const { map: mapId, room: roomId } = await params;
  const map = config.maps.find((m) => m.id === mapId);
  const room = map?.rooms.find((r) => r.id === roomId);
  if (!map || !room) {
    return {};
  }
  const t = await pageTranslator();
  return previewMetadata(config, {
    title: previewTitle(config, t, map, room),
    description: roomPreviewDescription(config, t, room),
    path: `/map/${map.id}/room/${room.id}`,
    image: {
      file: rooms[map.id]?.[room.id],
      ...size,
      alt: previewImageAlt(t, map, room),
    },
  });
}

export default async function Room({
  params,
}: {
  params: Promise<{ map: string; room: string }>;
}) {
  const { map, room } = await params;
  if (map === PLACEHOLDER.map && room === PLACEHOLDER.room) {
    notFound();
  }
  return <App mapId={map} roomId={room} />;
}
