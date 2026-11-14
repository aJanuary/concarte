import App from "../../../../App";
import config from "@/generated/config";

export async function generateStaticParams() {
  return config.maps.flatMap((map) =>
    map.rooms.map((room) => ({
      map: map.id,
      room: room.id,
    })),
  );
}

export default async function Room({
  params,
}: {
  params: Promise<{ map: string; room: string }>;
}) {
  const { map, room } = await params;
  return <App mapId={map} roomId={room} />;
}
