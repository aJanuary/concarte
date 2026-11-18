import { notFound } from "next/navigation";
import App from "../../../../App";
import config from "@/generated/config";

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
