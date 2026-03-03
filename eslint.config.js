import { readFileSync } from "node:fs";
import ESLintJS from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import { configs } from "typescript-eslint";

export default defineConfig(
  globalIgnores(readFileSync("./.gitignore", "utf8").split("\n").concat([".jj/"])),

  ESLintJS.configs.recommended,

  configs.strictTypeChecked,
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
    files: ["./*.config.js"],
    ...configs.disableTypeChecked,
  },
);
