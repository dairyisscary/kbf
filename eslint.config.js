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
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/only-throw-error": "off",
    },
  },
  {
    files: ["*.config.js"],
    ...configs.disableTypeChecked,
  },
  {
    ignores: readFileSync("./.gitignore", "utf8").split("\n").concat([".jj/"]),
  },
);
