import { getParameters } from "codesandbox/lib/api/define";

export const openInCodeSandbox = (completion: string) => {
  const parameters = getParameters({
    files: {
      "index.html": {
        isBinary: false,
        content: `<html class="size-full">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css" rel="stylesheet" />
<link href="tailwindai.css" rel="stylesheet">
</head>
${completion}
</html>`,
      },
      "tailwindai.css": {
        isBinary: false,
        content: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
body {
font-family: 'Inter', sans-serif!important;
}`,
      },
    },
  });
  const url = `https://codesandbox.io/api/v1/sandboxes/define?parameters=${parameters}`;
  window.open(url, "_blank");
};
