// @ts-check

import { readFileSync } from "node:fs";
import ESLintJS from "@eslint/js";
import { config, configs } from "typescript-eslint";

export default config(
  ESLintJS.configs.recommended,
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: { module: false },
    },
  },
  ...configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    ignores: readFileSync("./.gitignore", "utf8").split("\n").concat([".jj/"]),
  },
);
