import * as cheerio from "cheerio";

const extractHTMLFiles = (response: string) => {
  if (!response) return [];
  const $ = cheerio.load(response, {
    xml: { recognizeSelfClosing: false, xmlMode: false, decodeEntities: false },
  });
  const artifacts = $("tailwindaiartifact");
  const filesArray: { name: string | null; content: string }[] = [];

  artifacts.each((_, artifact) => {
    const files = $(artifact)
      .find("tailwindaiFile")
      .map((_, file) => {
        return {
          name: $(file).attr("name"),
          content: $(file).html()?.trim() || "",
        };
      })
      .get();
    filesArray.push(
      ...files.map((file) => ({ ...file, name: file.name || null })),
    );
  });

  return filesArray;
};

export const handleAIResponseForHTML = (response: string) => {
  const extractedHtmlFiles = extractHTMLFiles(response);
  console.log("extractedHtmlFiles", extractedHtmlFiles);
  return extractedHtmlFiles;
};
