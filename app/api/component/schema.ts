import { z } from "zod";

export const schema = z.object({
  tailwindConfig: z
    .string()
    .describe(
      "Generate the tailwind.config.js file. Always include this file in the response.",
    ),
  htmlTemplate: z
    .string()
    .describe(
      "Generate the index.html file. Always include this file in the response.",
    ),
  cssFile: z
    .string()
    .describe(
      "Generate the style.css file. Always include this file in the response.",
    ),
  script: z
    .string()
    .describe(
      "Generate the script.js file. Always include this file in the response.",
    )
    .nullish(),
  libs: z
    .string()
    .describe(
      "Generate the libs.html file. Always include this file in the response.",
    )
    .nullish(),
});

export type ComponentType = z.infer<typeof schema>;
