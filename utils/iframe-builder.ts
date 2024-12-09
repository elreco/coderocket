import { ComponentType } from "@/app/api/component/schema";

function buildHtmlDocument(
  htmlContent: string,
  libsInput: string,
  tailwindConfig: string,
  additionalHeadContent: string,
  additionalBodyContent: string,
) {
  return `
    <!DOCTYPE html>
    <html class="size-full">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      ${additionalHeadContent}
      ${libsInput}
      <script>
        ${tailwindConfig}
      </script>
    </head>
    <body class="size-full">
      ${htmlContent}
      ${additionalBodyContent}
    </body>
    </html>
  `;
}

export function iframeBuilder(completion: ComponentType | null) {
  if (!completion) {
    return "";
  }

  const htmlContent = completion?.htmlTemplate || "";
  const cssInput = completion?.cssFile || "";
  const libsInput = completion?.libs || "";
  const scriptInput = completion?.script || "";
  let tailwindConfig = completion?.tailwindConfig || "{}";

  tailwindConfig = tailwindConfig.replace(/module\.exports\s*=\s*/, "");

  const additionalHeadContent = `
    <style type="text/tailwindcss">
      ${cssInput}
    </style>
  `;

  const additionalBodyContent = `
    <script>
      //<![CDATA[
      document.addEventListener('DOMContentLoaded', function() {
        const links = document.querySelectorAll('a');
        links.forEach(link => {
          if (link.getAttribute('href') === '#') {
            link.addEventListener('click', function(event) {
              event.preventDefault();
            });
          }
        });
      });
      //]]>
      ${scriptInput}
    </script>
  `;

  return buildHtmlDocument(
    htmlContent,
    libsInput,
    tailwindConfig,
    additionalHeadContent,
    additionalBodyContent,
  );
}

export function downloadBuilder(completion: ComponentType | null) {
  if (!completion) {
    return "";
  }

  const htmlContent = completion?.htmlTemplate || "";
  const libsInput = completion?.libs || "";
  const scriptInput = completion?.script || "";
  let tailwindConfig = completion?.tailwindConfig || "{}";

  tailwindConfig = tailwindConfig.replace(/module\.exports\s*=\s*/, "");

  const additionalHeadContent = `
    <link rel="stylesheet" href="./style.css">
  `;

  const additionalBodyContent = `
    ${scriptInput ? `<script src="./script.js"></script>` : ""}
  `;

  return buildHtmlDocument(
    htmlContent,
    libsInput,
    tailwindConfig,
    additionalHeadContent,
    additionalBodyContent,
  );
}
