import type { Config } from "tailwindcss";
import AppConfig from "./app/config";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: AppConfig.theme,
    extend: {
      boxShadow: {
        top: "0px 0 10px rgba(0, 0, 0, 0.8)",
      },
      typography: ({ theme }: any) => ({
        default: {
          css: {
            color: theme("colors.primary-text"),
            a: {
              color: theme("colors.accent"),
              "&:hover": {
                color: theme("colors.accent-hover"),
              },
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
