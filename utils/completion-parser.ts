import { defaultTheme } from "./config";

const TAILWIND_SCRIPT_CDN =
  '<script src="https://cdn.tailwindcss.com"></script>';
const DAISYUI_CDN =
  '<link href="https://cdn.jsdelivr.net/npm/daisyui@latest/dist/full.css" rel="stylesheet">';

export const ensureCDNsPresent = (htmlContent: string): string => {
  let updatedContent = htmlContent;

  if (!htmlContent.includes("cdn.tailwindcss.com")) {
    updatedContent += `\n${TAILWIND_SCRIPT_CDN}`;
  }

  if (!htmlContent.includes("cdn.jsdelivr.net/npm/daisyui@latest")) {
    updatedContent += `\n${DAISYUI_CDN}`;
  }

  return updatedContent;
};

export const handleAIcompletionForHTML = (
  completion: string,
  isHtml: boolean = false,
) => {
  if (!completion) return [];

  const filesArray: { name: string | null; content: string }[] = [];

  // Chercher la dernière balise ouvrante d'artifact complète
  const artifactStartIndex = completion.lastIndexOf("<tailwindaiArtifact");
  if (artifactStartIndex === -1) return [];

  // Trouver la fin de la balise ouvrante
  const artifactOpenEndIndex = completion.indexOf(">", artifactStartIndex);
  if (artifactOpenEndIndex === -1) return [];

  // Extraire le contenu après la balise ouvrante
  const contentAfterArtifact = completion.slice(artifactOpenEndIndex + 1);

  // Regex pour trouver les balises de fichier
  const fileRegex =
    /<tailwindaiFile.*?name=["']([^"']*?)["'][^>]*>([\s\S]*?)(?=<\/tailwindaiFile>|<tailwindaiFile|$)/g;

  let match;
  while ((match = fileRegex.exec(contentAfterArtifact)) !== null) {
    const fileName = match[1];
    let content = match[2];

    // Si on trouve une balise fermante pour ce fichier, on l'utilise comme limite
    const closeTagIndex = content.indexOf("</tailwindaiFile>");
    if (closeTagIndex !== -1) {
      content = content.slice(0, closeTagIndex);
    }

    // Nettoyer le contenu sans affecter l'indentation
    content = content
      .replace(/<\/tailwindaiFile>/g, "")
      .replace(/<\/tailwindaiArtifact>/g, "")
      // Supprimer la première ligne si elle est vide
      .replace(/^\n/, "");

    // Assurez-vous que les CDN sont présents
    if (isHtml) {
      content = ensureCDNsPresent(content);
    }

    filesArray.push({
      name: fileName || null,
      content: content || completion,
    });
  }

  return filesArray;
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
export interface ContentChunk {
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

export const extractDataTheme = (completion: string): string => {
  const match = completion.match(/data-theme=["']([^"']*?)["']/);
  return match ? match[1] : defaultTheme;
};

export const setDataTheme = (completion: string, theme: string): string => {
  if (!completion.includes("data-theme=")) {
    // Si data-theme n'existe pas, l'ajouter à la première balise html
    return completion.replace(
      /<html([^>]*)>/,
      `<html$1 data-theme="${theme}">`,
    );
  }
  // Si data-theme existe déjà, mettre à jour sa valeur
  return completion.replace(
    /data-theme=["'][^"']*["']/,
    `data-theme="${theme}"`,
  );
};
