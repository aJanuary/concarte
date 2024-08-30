import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("app/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
};

export default withNextIntl(nextConfig);
