"use client";

import React, { useEffect, useState } from "react";

export default function RenderHtmlComponent({
  files,
}: {
  files: { name: string | null; content: string }[];
}) {
  const [testContent, setContent] = useState(files[0]?.content || "");
  useEffect(() => {
    setContent(files[0]?.content || "");
  }, [files]);

  useEffect(() => {
    const iframe = document.querySelector("iframe");
    if (!iframe) {
      console.warn("Iframe non trouvé");
      return;
    }

    const handleLinkClick = (event: MouseEvent) => {
      event.preventDefault();
      const target = event.target as HTMLAnchorElement;
      const fileName = target.getAttribute("href")?.replace("./", "");
      if (fileName) {
        const fileContent = files.find((file) => file.name === fileName);
        setContent(fileContent?.content || "");
      } else {
        console.warn("Aucun nom de fichier trouvé dans l'attribut href.");
      }
    };

    const onLoad = () => {
      const iframeDocument =
        iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDocument) {
        console.warn("Document de l'iframe non accessible");
        return;
      }

      const links = iframeDocument.querySelectorAll("a");
      links.forEach((link) => {
        link.addEventListener("click", handleLinkClick);
      }); // Délai de 100ms
    };

    iframe.addEventListener("load", onLoad);

    return () => {
      iframe.removeEventListener("load", onLoad);
    };
  }, [files]);

  return (
    <iframe
      srcDoc={testContent}
      style={{ width: "100%", height: "100%", border: "none" }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
