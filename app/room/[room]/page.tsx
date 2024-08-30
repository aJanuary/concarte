import Home from "../../page";
import config from "../../config";

export function generateStaticParams() {
  return config.map.rooms.map((room) => {
    return { room: room.id };
  });
}

export default function Room({
  params: { room },
}: {
  params: { room: string };
}) {
  return <Home roomId={room} />;
}
