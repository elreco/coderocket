export const storageUrl =
  "https://jojdwiugelqhcajbccxn.supabase.co/storage/v1/object/public/images";

export const screenshotApiUrl =
  "https://websitescreenshot.vercel.app/api/screenshot?url=";

export const maxPromptLength = 1000;

export const openAIModel = "gpt-4o-mini";

export const getHtmlContent = (completion: string) => `<html class="size-full">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="tailwindai.css" rel="stylesheet">
</head>
${completion}
</html>`;
