import { Inter } from "next/font/google";
import "./globals.css";
import config from "@/generated/config";
import { favicon } from "@/generated/assets";
import { withBasePath } from "./base-path";
import { eventDescription, eventTitle } from "./page-meta";
import { pageTranslator } from "./page-translator";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata() {
  const t = await pageTranslator();
  return {
    title: eventTitle(config, t),
    description: eventDescription(config, t),
    openGraph: {
      title: eventTitle(config, t),
      description: eventDescription(config, t),
    },
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
