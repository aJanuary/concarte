import { Inter } from "next/font/google";
import "./globals.css";
import config from "./config";
import { getLocale, getMessages } from "next-intl/server";
import {
  createTranslator,
  IntlConfig,
  NextIntlClientProvider,
  useTranslations,
} from "next-intl";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata() {
  const locale = await getLocale();
  const messages =
    (await getMessages()) as IntlConfig<IntlMessages>["messages"];
  const t = createTranslator({ locale, messages, namespace: "page" });

  return {
    title: t("title", { eventName: config.eventName }),
    description: t("description", { eventName: config.eventName }),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={inter.className + " bg-background text-primary-text"}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
