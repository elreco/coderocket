"use client";

const extractHTMLFiles = (response: string) => {
  if (!response) return [];

  const filesArray: { name: string | null; content: string }[] = [];

  console.log("Response reçue:", response.substring(0, 200));

  // Chercher d'abord la balise ouvrante de l'artifact avec un attribut title optionnel
  const artifactStartRegex = /<tailwindaiArtifact[^>]*>/i;
  const artifactStart = response.match(artifactStartRegex);
  console.log("Artifact start trouvé:", artifactStart);
  if (!artifactStart) return [];

  // Commencer l'analyse après la balise d'artifact
  const contentAfterArtifact = response.slice(
    artifactStart.index! + artifactStart[0].length,
  );
  console.log("🔥 contentAfterArtifact", contentAfterArtifact);
  // Regex pour les balises de fichier
  const openTagRegex = /<tailwindaiFile.*?name=["']([^"']*?)["'][^>]*>/gi;
  let lastIndex = 0;
  let currentFile: { name: string | null; content: string } | null = null;

  // Parcourir toutes les balises ouvrantes de fichier
  let match;
  while ((match = openTagRegex.exec(contentAfterArtifact)) !== null) {
    if (currentFile) {
      console.log("🔥 currentFile", currentFile);
      // Ajouter le contenu accumulé jusqu'à la prochaine balise, en nettoyant les balises
      let content = contentAfterArtifact.slice(lastIndex, match.index).trim();
      content = content
        .replace(/<\/tailwindaiFile>/g, "")
        .replace(/<\/tailwindaiArtifact>/g, "")
        .trim();
      currentFile.content += content;
      filesArray.push({ ...currentFile });
    }

    // Commencer un nouveau fichier
    currentFile = {
      name: match[1] || null,
      content: "",
    };

    lastIndex = match.index + match[0].length;
  }

  // Ajouter le contenu restant pour le dernier fichier
  if (currentFile) {
    let content = contentAfterArtifact.slice(lastIndex).trim();
    content = content
      .replace(/<\/tailwindaiFile>/g, "")
      .replace(/<\/tailwindaiArtifact>/g, "")
      .trim();
    currentFile.content += content;
    filesArray.push({ ...currentFile });
  }
  console.log("🔥 filesArray", filesArray);
  return filesArray;
};

export const handleAIResponseForHTML = (response: string) => {
  const extractedHtmlFiles = extractHTMLFiles(response);
  console.log("🔥 extractedHtmlFiles", extractedHtmlFiles);
  return extractedHtmlFiles;
};
