import { Inter } from "next/font/google";
import "./globals.css";
import config from "@/generated/config";
import { favicon } from "@/generated/assets";
import { withBasePath } from "./base-path";
import { getLocale, getMessages } from "next-intl/server";
import { createTranslator, NextIntlClientProvider } from "next-intl";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata() {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = createTranslator({ locale, messages, namespace: "page" });

  return {
    title: config.page?.title ?? t("title", { eventName: config.eventName }),
    description:
      config.page?.description ??
      t("description", { eventName: config.eventName }),
    ...(favicon && { icons: { icon: withBasePath(favicon) } }),
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
