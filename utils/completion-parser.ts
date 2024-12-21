import { parse } from "node-html-parser";

const extractHTMLFiles = (response: string) => {
  if (!response) return [];
  const root = parse(response);
  const artifacts = root.querySelectorAll("tailwindaiartifact");
  const filesArray: { name: string | null; content: string }[] = [];
  artifacts.forEach((artifact) => {
    const files = artifact.querySelectorAll("tailwindaifile");
    files.forEach((file) => {
      filesArray.push({
        name: file.getAttribute("name") || null,
        content: file.innerHTML.trim(),
      });
    });
  });

  return filesArray;
};

export const handleAIResponseForHTML = (response: string) => {
  const extractedHtmlFiles = extractHTMLFiles(response);
  console.log("extractedHtmlFiles", extractedHtmlFiles);
  return extractedHtmlFiles;
};
