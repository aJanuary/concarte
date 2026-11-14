import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";

const nextRules = nextCoreWebVitals
  .flatMap((config) => Object.keys(config.rules ?? {}))
  .filter((rule) => rule.startsWith("@next/next/"));

const eslintConfig = [
  {
    ignores: ["**/.next/**", "site/out/**", "build/**", "**/node_modules/**"],
  },
  ...nextCoreWebVitals,
  {
    settings: {
      next: { rootDir: "site/" },
      // Detection looks for React beside this file, where there is none.
      react: { version: "19" },
    },
  },
  {
    // The shared React and TypeScript rules apply everywhere, but Next's own
    // describe a Next app, which only the site is.
    ignores: ["site/**"],
    rules: Object.fromEntries(nextRules.map((rule) => [rule, "off"])),
  },
  prettier,
];

export default eslintConfig;
