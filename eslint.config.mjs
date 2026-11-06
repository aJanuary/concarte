import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "build/**", "node_modules/**"],
  },
  ...nextCoreWebVitals,
  prettier,
];

export default eslintConfig;
