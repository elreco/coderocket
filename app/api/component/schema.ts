import { z } from "zod";

export const schema = z.object({
  tailwindConfig: z.string().describe("Generate the tailwind.config.js file."),
  htmlTemplate: z.string().describe("Generate the index.html file."),
  cssFile: z.string().describe("Generate the style.css file."),
  script: z.string().describe("Generate the script.js file.").nullish(),
  libs: z.string().describe("Generate the libs.html file.").nullish(),
});

export type ComponentType = z.infer<typeof schema>;
