import App from "./App";
import config from "@/generated/config";
import { eventDescription, eventTitle, pageUrl } from "./page-meta";
import { pageTranslator } from "./page-translator";

export async function generateMetadata() {
  const t = await pageTranslator();
  return {
    openGraph: {
      title: eventTitle(config, t),
      description: eventDescription(config, t),
      url: pageUrl(config, ""),
    },
  };
}

export default function Index() {
  return <App />;
}
