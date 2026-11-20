import { getTranslations } from "next-intl/server";
import type { PageTranslator } from "./page-meta";

/** The `page` messages, for `generateMetadata`. */
export async function pageTranslator(): Promise<PageTranslator> {
  const t = await getTranslations("page");
  return (key, values) => t(key, values);
}
