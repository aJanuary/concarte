import { getRequestConfig } from "next-intl/server";
import config from "@/generated/config";

export default getRequestConfig(async () => {
  return {
    locale: config.locale,
    messages: (await import(`../messages/${config.locale}.json`)).default,
  };
});
