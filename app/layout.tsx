import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import config from "./config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: config.eventName + " venue map",
  description:
    "An interactive map of the convention venue for " + config.eventName,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className + " bg-background text-primary-text"}>
        {children}
      </body>
    </html>
  );
}
