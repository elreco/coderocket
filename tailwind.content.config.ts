import formsPlugin from "@tailwindcss/forms";
import typographyPlugin from "@tailwindcss/typography";
import { type Config } from "tailwindcss";

export default {
  content: ["app/**/**/*.{ts,tsx}"],
  /* safelist: [
    {
      pattern: /./,
    },
  ], */
  theme: {
    extend: {},
  },
  plugins: [formsPlugin, typographyPlugin],
} satisfies Config;
