import { defaultTheme } from "./config";

const TAILWIND_SCRIPT_CDN =
  '<script src="https://cdn.tailwindcss.com"></script>';
const DAISYUI_CDN =
  '<link href="https://cdn.jsdelivr.net/npm/daisyui@latest/dist/full.css" rel="stylesheet">';

// Ajoutez cette nouvelle interface et fonction
export interface ContentChunk {
  type: "text" | "artifact";
  content: string;
}

export interface ChatFile {
  name: string | null;
  content: string;
  isDelete?: boolean;
  isActive: boolean;
}

let previousFiles = new Map<string, string>(); // Pour stocker l'état précédent
let lastActiveFile: string | null = null; // Pour stocker le nom du dernier fichier actif

export const getUpdatedArtifactCode = (
  completion: string,
  artifactCode: string,
): string => {
  // Récupération du titre depuis l'artifact existant
  const titleMatch = artifactCode.match(
    /<tailwindaiArtifact\s+title=["']([^"']*?)["']/,
  );
  let artifactTitle = titleMatch ? titleMatch[1] : "Untitled"; // Valeur par défaut

  // Extraction du titre depuis la nouvelle réponse si disponible
  const newTitleMatch = completion.match(
    /<tailwindaiArtifact\s+title=["']([^"']*?)["']/,
  );
  if (newTitleMatch) {
    artifactTitle = newTitleMatch[1];
  }

  // Parse existing files from artifactCode
  const allFiles = new Map();
  const filesToDelete = new Set();

  // Extract existing files
  const existingFileRegex =
    /<tailwindaiFile.*?name=["']([^"']*?)["'].*?>([\s\S]*?)<\/tailwindaiFile>/g;
  let existingMatch;
  while ((existingMatch = existingFileRegex.exec(artifactCode)) !== null) {
    const fileName = existingMatch[1];
    const content = existingMatch[2].trim();
    allFiles.set(fileName, content);
  }

  // Extract new/updated files from completion, including partial ones
  const completionFiles = new Map();
  const fileRegex =
    /<tailwindaiFile.*?name=["']([^"']*?)["'].*?(?:action=["']([^"']*?)["'].*?)?>([\s\S]*?)(?=<\/tailwindaiFile|<tailwindaiFile|$)/g;
  let match;

  while ((match = fileRegex.exec(completion)) !== null) {
    const fileName = match[1];
    const action = match[2];
    let content = match[3].trim();

    // Nettoyage du contenu
    content = content
      .replace(/<\/tailwindaiFile>.*$/g, "")
      .replace(/<\/tailwindaiArtifact>.*$/g, "")
      .trim();

    if (action === "delete") {
      filesToDelete.add(fileName);
    } else if (content) {
      completionFiles.set(fileName, content);
    }
  }

  // Fusion des fichiers en donnant la priorité aux nouveaux fichiers
  completionFiles.forEach((content, fileName) => {
    allFiles.set(fileName, content);
  });

  // Construction du nouvel artifact avec le titre
  let mergedArtifact = `<tailwindaiArtifact title="${artifactTitle}">\n`;
  allFiles.forEach((content, fileName) => {
    if (!filesToDelete.has(fileName)) {
      mergedArtifact += `<tailwindaiFile name="${fileName}">\n${content}\n</tailwindaiFile>\n`;
    }
  });
  mergedArtifact += "</tailwindaiArtifact>";

  return mergedArtifact;
};

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

export const extractFilesFromCompletion = (
  completion: string,
  isHtml: boolean = false,
) => {
  if (!completion) return [];

  const filesArray: ChatFile[] = [];
  const artifactRegex =
    /<tailwindaiArtifact(?:\s+title=["']([^"']*?)["'])?>[\s\S]*?<\/tailwindaiArtifact>/g;

  const artifacts = Array.from(completion.matchAll(artifactRegex));

  if (artifacts.length === 0) return [];

  // Traiter chaque artifact trouvé
  artifacts.forEach((artifactMatch) => {
    const artifactContent = artifactMatch[0];
    const fileRegex =
      /<tailwindaiFile.*?name=["']([^"']*?)["'].*?(?:action=["']([^"']*?)["'].*?)?>([\s\S]*?)(?=<\/tailwindaiFile>|<tailwindaiFile|$)/g;

    let match;
    while ((match = fileRegex.exec(artifactContent)) !== null) {
      const fileName = match[1];
      const action = match[2];
      let content = match[3].trim();

      // Si on trouve une balise fermante pour ce fichier, on l'utilise comme limite
      const closeTagIndex = content.indexOf("</tailwindaiFile>");
      if (closeTagIndex !== -1) {
        content = content.slice(0, closeTagIndex);
      }

      // Nettoyage du contenu
      content = content
        .replace(/<\/tailwindaiFile>/g, "")
        .replace(/<\/tailwindaiArtifact>/g, "")
        .replace(/^\n/, "");

      // Trouver l'indentation minimale commune
      const lines = content.split("\n");
      const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
      const indentations = nonEmptyLines.map((line) => {
        const match = line.match(/^[ \t]*/);
        return match ? match[0].length : 0;
      });
      const minIndent = Math.min(...indentations);

      // Retirer l'indentation minimale commune de chaque ligne
      content = lines
        .map((line) => line.slice(minIndent))
        .join("\n")
        .trim();

      // Assurez-vous que les CDNs sont présents
      if (isHtml) {
        content = ensureCDNsPresent(content);
      }

      // Ajouter le fichier au tableau
      filesArray.push({
        name: fileName || null,
        content: content || completion,
        isDelete: action === "delete",
        isActive: false,
      });
    }
  });
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
  return /<tailwindaiArtifact(?:\s+title=["']([^"']*?)["'])?>/i.test(
    completion,
  );
};

export const hasFiles = (completion: string): boolean => {
  return /<tailwindaiFile/i.test(completion);
};

export const splitContentIntoChunks = (completion: string): ContentChunk[] => {
  const chunks: ContentChunk[] = [];

  // Ne traiter que les artifacts complets
  const artifactRegex =
    /<tailwindaiArtifact(?:\s+title=["']([^"']*?)["'])?>[\s\S]*?<\/tailwindaiArtifact>/g;

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

export const extractTitle = (completion: string): string | null => {
  const match = completion.match(
    /<tailwindaiArtifact\s+title=["']([^"']*?)["']/,
  );
  return match ? match[1] : null;
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

export const extractFilesFromArtifact = (artifactCode: string): ChatFile[] => {
  if (!artifactCode) return [];

  const currentFiles = new Map<string, string>();
  const filesArray: ChatFile[] = [];
  let newActiveFile: string | null = null;

  const fileRegex =
    /<tailwindaiFile.*?name=["']([^"']*?)["'].*?(?:action=["']([^"']*?)["'].*?)?>([\s\S]*?)(?=<\/tailwindaiFile>|<tailwindaiFile|$)/g;

  let match;
  while ((match = fileRegex.exec(artifactCode)) !== null) {
    const fileName = match[1];
    const action = match[2];
    let content = match[3].trim();

    // Si on trouve une balise fermante pour ce fichier, on l'utilise comme limite
    const closeTagIndex = content.indexOf("</tailwindaiFile>");
    if (closeTagIndex !== -1) {
      content = content.slice(0, closeTagIndex);
    }

    // Nettoyer le contenu
    content = content
      .replace(/<\/tailwindaiFile>/g, "")
      .replace(/<\/tailwindaiArtifact>/g, "")
      .replace(/^\n/, "");

    // Trouver l'indentation minimale commune
    const lines = content.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    const indentations = nonEmptyLines.map((line) => {
      const match = line.match(/^[ \t]*/);
      return match ? match[0].length : 0;
    });
    const minIndent = Math.min(...indentations);

    // Retirer l'indentation minimale commune de chaque ligne
    content = lines
      .map((line) => line.slice(minIndent))
      .join("\n")
      .trim();

    // Stocker le contenu actuel
    currentFiles.set(fileName, content);

    // Si le contenu a changé, c'est le nouveau fichier actif
    if (
      previousFiles.has(fileName) &&
      previousFiles.get(fileName) !== content
    ) {
      newActiveFile = fileName;
    }

    filesArray.push({
      name: fileName || null,
      content: content,
      isDelete: action === "delete",
      isActive: false, // On mettra à jour après la boucle
    });
  }

  // Mettre à jour le fichier actif
  lastActiveFile = newActiveFile || lastActiveFile;

  // Mettre à jour isActive pour le fichier actif
  filesArray.forEach((file) => {
    if (file.name === lastActiveFile) {
      file.isActive = true;
    }
  });

  // Mettre à jour previousFiles pour la prochaine comparaison
  previousFiles = currentFiles;

  return filesArray;
};
