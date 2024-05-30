import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        "kbf-dark-purple": "#17153a",
        "kbf-light-purple": "#211f48",
        "kbf-accent-border": "#272552",
        "kbf-text-main": "#b5b5c2",
        "kbf-text-highlight": "#fefefe",
        "kbf-text-accent": "#6c6aea",
        "kbf-action-alt": "#A30D79",
        "kbf-action": "#CA1395",
        "kbf-action-highlight": "#64B6AC",
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
    },
  },
} satisfies Config;
