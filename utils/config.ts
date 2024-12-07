import { createOpenAI } from "@ai-sdk/openai";

export const storageUrl =
  "https://jojdwiugelqhcajbccxn.supabase.co/storage/v1/object/public/images";

export const screenshotApiUrl =
  "https://screenshot-api-elreco.vercel.app/api?url=";

export const maxPromptLength = 1000;

export const openAINewModel = createOpenAI({
  name: "gpt-4o-mini",
  apiKey: process.env.OPEN_AI || "",
  compatibility: "strict",
});

export const openAIModel = "gpt-4o-mini";

export const getHtmlContent = (completion: string) => `<html class="size-full">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://kit.fontawesome.com/0d11f7e939.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">
<link href="tailwindai.css" rel="stylesheet">
</head>
${completion}
</html>`;

export const cssContent = `body {
  font-family: "Open Sans", sans-serif!important;
}`;
