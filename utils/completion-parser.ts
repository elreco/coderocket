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
  isIncomplete?: boolean;
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

export const extractFilesFromCompletedCompletion = (
  completion: string,
  isHtml: boolean = false,
) => {
  if (!completion) return [];

  // Vérifier si le contenu contient des balises d'artifact complètes ou partielles
  const hasCompleteArtifactTags =
    completion.includes("<tailwindaiArtifact") &&
    completion.includes("</tailwindaiArtifact>");
  const hasPartialArtifactTags =
    completion.includes("<tailwindaiArtifact") &&
    !completion.includes("</tailwindaiArtifact>");
  const hasIncompleteMarker =
    completion.includes("<!-- FINISH_REASON: length -->") ||
    completion.includes("<!-- FINISH_REASON: error -->");

  // Si le contenu contient le marqueur de fin de token mais pas d'artifacts complets,
  // extraire les fichiers des artifacts partiels
  if (
    hasIncompleteMarker &&
    !hasCompleteArtifactTags &&
    hasPartialArtifactTags
  ) {
    return extractFilesFromIncompleteArtifact(completion, isHtml);
  }

  // Si aucune balise d'artifact n'est trouvée, retourner un tableau vide
  if (!hasCompleteArtifactTags && !hasPartialArtifactTags) {
    return [];
  }

  const filesArray: ChatFile[] = [];

  // Regex pour trouver les artifacts complets
  const artifactRegex = /<tailwindaiArtifact[\s\S]*?<\/tailwindaiArtifact>/g;

  // Trouver tous les artifacts
  const artifactMatches = [];
  let match;
  while ((match = artifactRegex.exec(completion)) !== null) {
    artifactMatches.push(match[0]);
  }

  // Si aucun artifact complet n'est trouvé mais qu'il y a des balises partielles,
  // extraire les fichiers des artifacts partiels
  if (artifactMatches.length === 0 && hasPartialArtifactTags) {
    return extractFilesFromIncompleteArtifact(completion, isHtml);
  }

  // Traiter chaque artifact complet trouvé
  for (const artifactContent of artifactMatches) {
    const fileRegex =
      /<tailwindaiFile.*?name=["']([^"']*?)["'].*?(?:action=["']([^"']*?)["'].*?)?>([\s\S]*?)(?=<\/tailwindaiFile>|<tailwindaiFile|$)/g;

    let fileMatch;
    while ((fileMatch = fileRegex.exec(artifactContent)) !== null) {
      const fileName = fileMatch[1];
      const action = fileMatch[2];
      let content = fileMatch[3].trim();

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

      // Vérifier si le fichier est incomplet (contient le marqueur de fin de token)
      const isIncomplete =
        content.includes("<!-- FINISH_REASON: length -->") ||
        content.includes("<!-- FINISH_REASON: error -->");

      // Trouver l'indentation minimale commune
      const lines = content.split("\n");
      const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
      const indentations = nonEmptyLines.map((line) => {
        const match = line.match(/^[ \t]*/);
        return match ? match[0].length : 0;
      });
      const minIndent = indentations.length > 0 ? Math.min(...indentations) : 0;

      // Retirer l'indentation minimale commune de chaque ligne
      content = lines
        .map((line) => line.slice(minIndent))
        .join("\n")
        .trim();

      // Assurez-vous que les CDNs sont présents
      if (isHtml) {
        content = ensureCDNsPresent(content);
      }

      // Ajouter le fichier au tableau, même s'il est incomplet
      filesArray.push({
        name: fileName || null,
        content: content || completion,
        isDelete: action === "delete",
        isActive: false,
        isIncomplete: isIncomplete, // Ajouter une propriété pour indiquer si le fichier est incomplet
      });
    }
  }

  return filesArray;
};

// Nouvelle fonction pour extraire les fichiers d'un artifact incomplet
export const extractFilesFromIncompleteArtifact = (
  completion: string,
  isHtml: boolean = false,
): ChatFile[] => {
  const filesArray: ChatFile[] = [];

  // Trouver le début de l'artifact incomplet
  const artifactStartIndex = completion.lastIndexOf("<tailwindaiArtifact");
  if (artifactStartIndex === -1) {
    return [];
  }

  // Extraire le contenu de l'artifact incomplet
  const incompleteArtifactContent = completion.slice(artifactStartIndex);

  // Regex pour trouver les fichiers dans l'artifact incomplet
  // Cette regex est plus permissive pour capturer les fichiers même dans un artifact incomplet
  const fileRegex =
    /<tailwindaiFile.*?name=["']([^"']*?)["'].*?>([\s\S]*?)(?=<\/tailwindaiFile>|<tailwindaiFile|$)/g;

  let fileMatch;
  while ((fileMatch = fileRegex.exec(incompleteArtifactContent)) !== null) {
    const fileName = fileMatch[1];
    let content = fileMatch[2].trim();

    // Nettoyage du contenu
    content = content
      .replace(/<\/tailwindaiFile>/g, "")
      .replace(/<\/tailwindaiArtifact>/g, "")
      .replace(/^\n/, "");

    // Vérifier si le fichier est incomplet (contient le marqueur de fin de token)
    const isIncomplete =
      content.includes("<!-- FINISH_REASON: length -->") ||
      content.includes("<!-- FINISH_REASON: error -->");

    // Trouver l'indentation minimale commune
    const lines = content.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    const indentations = nonEmptyLines.map((line) => {
      const match = line.match(/^[ \t]*/);
      return match ? match[0].length : 0;
    });
    const minIndent = indentations.length > 0 ? Math.min(...indentations) : 0;

    // Retirer l'indentation minimale commune de chaque ligne
    content = lines
      .map((line) => line.slice(minIndent))
      .join("\n")
      .trim();

    // Assurez-vous que les CDNs sont présents
    if (isHtml) {
      content = ensureCDNsPresent(content);
    }

    // Ajouter le fichier au tableau, en le marquant comme incomplet si nécessaire
    filesArray.push({
      name: fileName || null,
      content: content || completion,
      isDelete: false,
      isActive: false,
      isIncomplete: isIncomplete,
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
  return /<tailwindaiArtifact(?:\s+title=["']([^"']*?)["'])?>/i.test(
    completion,
  );
};

export const hasCompletedArtifacts = (completion: string): boolean => {
  // Vérifier si le contenu contient des balises d'artifact complètes ou partielles
  const hasCompleteArtifactTags =
    completion.includes("<tailwindaiArtifact") &&
    completion.includes("</tailwindaiArtifact>");
  const hasPartialArtifactTags =
    completion.includes("<tailwindaiArtifact") &&
    !completion.includes("</tailwindaiArtifact>");
  const hasIncompleteMarker =
    completion.includes("<!-- FINISH_REASON: length -->") ||
    completion.includes("<!-- FINISH_REASON: error -->");

  // Si le contenu contient des balises partielles et le marqueur de fin de token,
  // considérer qu'il y a des artifacts (même s'ils sont incomplets)
  if (hasPartialArtifactTags && hasIncompleteMarker) {
    return true;
  }

  // Si aucune balise d'artifact n'est trouvée, retourner false
  if (!hasCompleteArtifactTags && !hasPartialArtifactTags) {
    return false;
  }

  // Si on a des balises partielles mais pas complètes et pas de marqueur de fin de token,
  // retourner false
  if (
    hasPartialArtifactTags &&
    !hasCompleteArtifactTags &&
    !hasIncompleteMarker
  ) {
    return false;
  }

  // Regex pour trouver les artifacts complets
  const artifactRegex = /<tailwindaiArtifact[\s\S]*?<\/tailwindaiArtifact>/g;

  // Trouver tous les artifacts
  const artifactMatches = [];
  let match;
  while ((match = artifactRegex.exec(completion)) !== null) {
    artifactMatches.push(match[0]);
  }

  // Si aucun artifact complet n'est trouvé, retourner false
  if (artifactMatches.length === 0) {
    return false;
  }

  // Vérifier si au moins un artifact ne contient pas de fichiers incomplets
  for (const artifactContent of artifactMatches) {
    const containsIncompleteFile =
      artifactContent.includes("<!-- FINISH_REASON: length -->") ||
      artifactContent.includes("<!-- FINISH_REASON: error -->");

    // Si au moins un artifact ne contient pas de fichier incomplet, retourner true
    if (!containsIncompleteFile) {
      return true;
    }
  }

  // Tous les artifacts contiennent des fichiers incomplets
  return false;
};

export const hasFiles = (completion: string): boolean => {
  return /<tailwindaiFile/i.test(completion);
};

export const splitCompletedContentIntoChunks = (
  completion: string,
): ContentChunk[] => {
  const chunks: ContentChunk[] = [];

  // Vérifier si le contenu contient des balises d'artifact complètes ou partielles
  const hasCompleteArtifactTags =
    completion.includes("<tailwindaiArtifact") &&
    completion.includes("</tailwindaiArtifact>");
  const hasPartialArtifactTags =
    completion.includes("<tailwindaiArtifact") &&
    !completion.includes("</tailwindaiArtifact>");

  // Si le contenu contient des balises partielles, extraire le texte avant l'artifact partiel
  if (hasPartialArtifactTags) {
    const artifactStartIndex = completion.lastIndexOf("<tailwindaiArtifact");

    // Ajouter le texte avant l'artifact partiel comme chunk de type "text"
    if (artifactStartIndex > 0) {
      const textBeforeArtifact = completion.slice(0, artifactStartIndex).trim();
      if (textBeforeArtifact) {
        chunks.push({
          type: "text",
          content: textBeforeArtifact,
        });
      }
    }

    // Extraire les fichiers de l'artifact partiel
    const artifactContent = completion.slice(artifactStartIndex);

    // Vérifier si l'artifact partiel contient des fichiers valides
    const files = extractFilesFromIncompleteArtifact(completion, false);
    const hasValidFiles = files.some((file) => !file.isIncomplete);

    // Si l'artifact partiel contient des fichiers valides, l'ajouter comme chunk de type "artifact"
    if (hasValidFiles) {
      // Créer un artifact complet à partir de l'artifact partiel
      const completeArtifact = `<tailwindaiArtifact title="Generated Files">
${files
  .filter((file) => !file.isIncomplete)
  .map(
    (file) => `<tailwindaiFile name="${file.name}">
${file.content}
</tailwindaiFile>`,
  )
  .join("\n")}
</tailwindaiArtifact>`;

      chunks.push({
        type: "artifact",
        content: completeArtifact,
      });
    } else {
      // Sinon, ajouter tout le reste comme chunk de type "text"
      chunks.push({
        type: "text",
        content: artifactContent,
      });
    }
    return chunks;
  }

  // Si aucune balise d'artifact n'est trouvée, retourner tout le contenu comme texte
  if (!hasCompleteArtifactTags && !hasPartialArtifactTags) {
    if (completion.trim()) {
      chunks.push({
        type: "text",
        content: completion,
      });
    }
    return chunks;
  }

  // Regex pour trouver les artifacts complets
  const artifactRegex = /<tailwindaiArtifact[\s\S]*?<\/tailwindaiArtifact>/g;

  // Trouver tous les artifacts complets
  const artifactMatches = [];
  let match;
  while ((match = artifactRegex.exec(completion)) !== null) {
    artifactMatches.push({
      content: match[0],
      index: match.index,
    });
  }

  // Si aucun artifact complet n'est trouvé, retourner tout le contenu comme texte
  if (artifactMatches.length === 0) {
    chunks.push({
      type: "text",
      content: completion,
    });
    return chunks;
  }

  let currentIndex = 0;

  // Traiter chaque artifact complet trouvé
  for (const match of artifactMatches) {
    const artifactContent = match.content;
    const matchIndex = match.index;

    // Ajouter le texte avant l'artifact
    if (matchIndex > currentIndex) {
      const textContent = completion.slice(currentIndex, matchIndex);
      if (textContent.trim()) {
        chunks.push({
          type: "text",
          content: textContent,
        });
      }
    }

    // Vérifier si l'artifact contient des fichiers incomplets
    const containsIncompleteFile =
      artifactContent.includes("<!-- FINISH_REASON: length -->") ||
      artifactContent.includes("<!-- FINISH_REASON: error -->");

    // Ajouter l'artifact comme type "artifact" s'il ne contient pas de fichiers incomplets
    if (!containsIncompleteFile) {
      chunks.push({
        type: "artifact",
        content: artifactContent,
      });
    } else {
      // Si l'artifact contient des fichiers incomplets, le traiter comme du texte
      chunks.push({
        type: "text",
        content: artifactContent,
      });
    }

    currentIndex = matchIndex + artifactContent.length;
  }

  // Ajouter le texte restant après le dernier artifact
  if (currentIndex < completion.length) {
    const textContent = completion.slice(currentIndex);
    if (textContent.trim()) {
      chunks.push({
        type: "text",
        content: textContent,
      });
    }
  }
  return chunks;
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
