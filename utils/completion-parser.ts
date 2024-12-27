import { defaultTheme } from "./config";

export const handleAIcompletionForHTML = (
  completion: string,
  theme: string | null | undefined,
) => {
  if (!completion) return [];

  if (!theme) {
    theme = defaultTheme;
  }

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
    // Ne plus retirer l'indentation
    // .replace(/^\s{4}/gm, ""); <- Cette ligne est supprimée

    // Ajouter ou mettre à jour l'attribut data-theme dans les balises HTML
    content = content.replace(/(<html[^>]*)(>)/g, (match, p1, p2) => {
      // Si data-theme existe déjà, le remplacer
      if (p1.includes("data-theme=")) {
        return (
          p1.replace(/data-theme=["'][^"']*["']/, `data-theme="${theme}"`) + p2
        );
      }
      // Sinon, l'ajouter
      return `${p1} data-theme="${theme}"${p2}`;
    });

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
