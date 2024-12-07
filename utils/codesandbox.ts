import { getParameters } from "codesandbox/lib/api/define";

import { cssContent, getHtmlContent } from "./config";

export const openInCodeSandbox = (completion: string) => {
  const parameters = getParameters({
    files: {
      "index.html": {
        isBinary: false,
        content: getHtmlContent(completion),
      },
      "tailwindai.css": {
        isBinary: false,
        content: cssContent,
      },
    },
  });
  const url = `https://codesandbox.io/api/v1/sandboxes/define?parameters=${parameters}`;
  window.open(url, "_blank");
};
