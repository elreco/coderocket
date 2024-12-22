"use client";

const extractHTMLFiles = (completion: string) => {
  if (!completion) return [];

  const filesArray: { name: string | null; content: string }[] = [];

  console.log("completion reçue:", completion.substring(0, 200));

  // Chercher d'abord la balise ouvrante de l'artifact
  const artifactStartRegex = /<tailwindaiArtifact[^>]*>/i;
  const artifactStart = completion.match(artifactStartRegex);
  console.log("Artifact start trouvé:", artifactStart);
  if (!artifactStart) return [];

  // Trouver la balise fermante de l'artifact
  const artifactEndRegex = /<\/tailwindaiArtifact>/i;
  const artifactEnd = completion.match(artifactEndRegex);
  if (!artifactEnd) return [];

  // Extraire uniquement le contenu entre les balises artifact
  const contentAfterArtifact = completion.slice(
    artifactStart.index! + artifactStart[0].length,
    artifactEnd.index,
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

export const handleAIcompletionForHTML = (completion: string) => {
  const extractedHtmlFiles = extractHTMLFiles(completion);
  console.log(extractedHtmlFiles);
  console.log("🔥 extractedHtmlFiles", extractedHtmlFiles);
  return extractedHtmlFiles;
};

// Je veux récupérer tout le contenu de la réponse, sans les balises
// et pas les balises de fichier
export const extractContent = (completion: string) => {
  // Supprimer toute partie de texte commençant par <tailwindai
  const withoutPartialArtifact = completion.replace(/<tailwindai[^>]*$/g, "");

  // Remplacer temporairement les artifacts par un marqueur spécial
  let artifactCounter = 0;
  const artifacts: string[] = [];

  const textWithPlaceholders = withoutPartialArtifact.replace(
    /<tailwindaiArtifact>[\s\S]*?<\/tailwindaiArtifact>/g,
    (match) => {
      artifacts.push(match);
      return `__ARTIFACT_${artifactCounter++}__`;
    },
  );

  // Nettoyer le reste du HTML
  const cleanedText = textWithPlaceholders
    .replace(/<[^>]*>/g, "")
    .replace(/<[^>]*$/, "")
    .replace(/&[^;]+;/g, "")
    .replace(/\r\n/g, "\n");

  // Remettre les artifacts à leur place
  const finalText = cleanedText.replace(
    /__ARTIFACT_(\d+)__/g,
    (_, index) => artifacts[parseInt(index)],
  );

  return finalText;
};

export const hasArtifacts = (completion: string): boolean => {
  return /<tailwindaiArtifact>/i.test(completion);
};

export const hasFiles = (completion: string): boolean => {
  return /<tailwindaiFile/i.test(completion);
};

// Ajoutez cette nouvelle interface et fonction
interface ContentChunk {
  type: "text" | "artifact";
  content: string;
}

export const splitContentIntoChunks = (completion: string): ContentChunk[] => {
  const chunks: ContentChunk[] = [];

  // Ne traiter que les artifacts complets
  const artifactRegex = /<tailwindaiArtifact>[\s\S]*?<\/tailwindaiArtifact>/g;
  const artifactStartRegex = /<tailwindaiArtifact/i;

  // Si on a un début d'artifact sans fin, on ne traite pas le texte après
  const lastArtifactStartIndex = completion.lastIndexOf("<tailwindaiArtifact");
  const lastArtifactEndIndex = completion.lastIndexOf("</tailwindaiArtifact>");

  // Si on a un début d'artifact sans fin, on coupe le texte à cet endroit
  const safeCompletion =
    lastArtifactStartIndex > lastArtifactEndIndex
      ? completion.slice(0, lastArtifactStartIndex)
      : completion;

  let currentIndex = 0;
  let match;

  while ((match = artifactRegex.exec(safeCompletion)) !== null) {
    // Ajouter le texte avant l'artifact
    if (match.index > currentIndex) {
      const textContent = safeCompletion
        .slice(currentIndex, match.index)
        .trim();
      if (textContent) {
        chunks.push({ type: "text", content: textContent });
      }
    }

    // N'ajouter que les artifacts complets
    if (match[0].endsWith("</tailwindaiArtifact>")) {
      chunks.push({ type: "artifact", content: match[0] });
    }

    currentIndex = match.index + match[0].length;
  }

  // Ajouter le texte restant seulement s'il n'y a pas d'artifact partiel
  if (currentIndex < safeCompletion.length) {
    const remainingText = safeCompletion.slice(currentIndex).trim();
    if (remainingText && !artifactStartRegex.test(remainingText)) {
      chunks.push({ type: "text", content: remainingText });
    }
  }

  return chunks;
};
