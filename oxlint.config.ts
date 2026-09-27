import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    reportUnusedDisableDirectives: "error",
    respectEslintDisableDirectives: false,
    typeAware: true,
  },
  categories: {
    correctness: "error",
    perf: "error",
    suspicious: "error",
  },
  plugins: ["eslint", "import", "jsx-a11y", "oxc", "typescript", "unicorn"],
  overrides: [
    {
      files: ["./src/db/migrations/*.ts"],
      rules: {
        "no-await-in-loop": "off",
      },
    },
  ],
  rules: {
    "no-console": "error",
    "no-debugger": "error",
    "oxc/no-map-spread": "off",
    "typescript/consistent-return": "off",
    "typescript/promise-function-async": "off",
    "typescript/no-explicit-any": "error",
    "typescript/no-unsafe-type-assertion": "off",
  },
});
