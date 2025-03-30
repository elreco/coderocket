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
  isContinue?: boolean;
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

    // Supprimer le marqueur FINISH_REASON s'il existe
    const cleanedContent = content.replace(
      /\n\n<!-- FINISH_REASON: (?:length|error) -->$/,
      "",
    );
    allFiles.set(fileName, cleanedContent);
  }

  // Extract new/updated files from completion, including partial ones
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
    } else if (action === "continue") {
      // Nouvelle action "continue" pour continuer un fichier incomplet
      const normalizedFileName = fileName.trim();
      // Check if the file exists with exact name or similar name (case insensitive)
      const existingFileKey = Array.from(allFiles.keys()).find(
        (key) => key.toLowerCase() === normalizedFileName.toLowerCase(),
      );

      if (existingFileKey) {
        const existingContent = allFiles.get(existingFileKey);
        // Nettoyer le contenu existant de tout marqueur de fin
        const cleanedExistingContent = existingContent.replace(
          /\n\n<!-- FINISH_REASON: (?:length|error) -->$/,
          "",
        );

        // Amélioration de la logique de concaténation pour éviter les espaces superflus
        // On concatène directement si le contenu existant se termine par un \n
        // ou si le nouveau contenu commence par un \n
        const existingEndsWithNewline = cleanedExistingContent.endsWith("\n");
        const newContentStartsWithNewline = content.startsWith("\n");

        // Concaténer le nouveau contenu au contenu existant sans ajouter d'espace
        if (existingEndsWithNewline || newContentStartsWithNewline) {
          // Si l'un des deux a déjà un saut de ligne, concaténer directement
          allFiles.set(
            existingFileKey,
            existingEndsWithNewline
              ? cleanedExistingContent + content.replace(/^\n/, "")
              : cleanedExistingContent + content,
          );
        } else {
          // Sinon, déterminer s'il faut ajouter un espace en analysant le contexte du code
          const lastChar = cleanedExistingContent.charAt(
            cleanedExistingContent.length - 1,
          );
          const firstChar = content.charAt(0);

          // Les caractères qui n'ont généralement pas besoin d'espace entre eux
          const noSpaceNeededAfter = [
            "{",
            "(",
            "[",
            ".",
            ",",
            ":",
            "<",
            "'",
            '"',
            "`",
            "=",
            "+",
            "-",
            "*",
            "/",
          ];
          const noSpaceNeededBefore = [
            "}",
            ")",
            "]",
            ".",
            ",",
            ":",
            ">",
            "'",
            '"',
            "`",
            ";",
          ];

          const needsSpace = !(
            noSpaceNeededAfter.includes(lastChar) ||
            noSpaceNeededBefore.includes(firstChar)
          );

          allFiles.set(
            existingFileKey,
            cleanedExistingContent + (needsSpace ? " " : "") + content,
          );
        }
      } else {
        // Si le fichier n'existe pas, le traiter comme un nouveau fichier
        console.warn(
          `File not found for continue action: ${normalizedFileName}. Creating new file.`,
        );
        allFiles.set(normalizedFileName, content);
      }
    } else if (content) {
      // Si le fichier existe déjà et ne contient pas de marqueur FINISH_REASON,
      // on concatène le nouveau contenu au contenu existant
      if (allFiles.has(fileName)) {
        const existingContent = allFiles.get(fileName);
        // Vérifier si le contenu existant se terminait par un marqueur FINISH_REASON
        const hadFinishReason = existingContent.includes("<!-- FINISH_REASON:");

        if (hadFinishReason) {
          // Nettoyer le contenu existant de tout marqueur de fin
          const cleanedExistingContent = existingContent.replace(
            /\n\n<!-- FINISH_REASON: (?:length|error) -->$/,
            "",
          );

          // Même logique améliorée pour éviter les espaces superflus
          const existingEndsWithNewline = cleanedExistingContent.endsWith("\n");
          const newContentStartsWithNewline = content.startsWith("\n");

          // Concaténer le nouveau contenu au contenu existant sans ajouter d'espace
          if (existingEndsWithNewline || newContentStartsWithNewline) {
            // Si l'un des deux a déjà un saut de ligne, concaténer directement
            allFiles.set(
              fileName,
              existingEndsWithNewline
                ? cleanedExistingContent + content.replace(/^\n/, "")
                : cleanedExistingContent + content,
            );
          } else {
            // Sinon, déterminer s'il faut ajouter un espace en analysant le contexte du code
            const lastChar = cleanedExistingContent.charAt(
              cleanedExistingContent.length - 1,
            );
            const firstChar = content.charAt(0);

            // Les caractères qui n'ont généralement pas besoin d'espace entre eux
            const noSpaceNeededAfter = [
              "{",
              "(",
              "[",
              ".",
              ",",
              ":",
              "<",
              "'",
              '"',
              "`",
              "=",
              "+",
              "-",
              "*",
              "/",
            ];
            const noSpaceNeededBefore = [
              "}",
              ")",
              "]",
              ".",
              ",",
              ":",
              ">",
              "'",
              '"',
              "`",
              ";",
            ];

            const needsSpace = !(
              noSpaceNeededAfter.includes(lastChar) ||
              noSpaceNeededBefore.includes(firstChar)
            );

            allFiles.set(
              fileName,
              cleanedExistingContent + (needsSpace ? " " : "") + content,
            );
          }
        } else {
          // Sinon, on remplace par le nouveau contenu
          allFiles.set(fileName, content);
        }
      } else {
        // Nouveau fichier
        allFiles.set(fileName, content);
      }
    }
  }

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

// Nouvelle fonction pour extraire directement les fichiers, même mal formatés
export function extractDirectFiles(content: string): ChatFile[] {
  if (!content || !content.includes("<tailwindaiFile")) {
    return [];
  }

  const files: ChatFile[] = [];
  let currentIndex = 0;

  while (currentIndex < content.length) {
    const fileStart = content.indexOf("<tailwindaiFile", currentIndex);
    if (fileStart === -1) break;

    const nameStart = content.indexOf('name="', fileStart);
    if (nameStart === -1) break;

    const nameEnd = content.indexOf('"', nameStart + 6);
    if (nameEnd === -1) break;

    const fileName = content.slice(nameStart + 6, nameEnd).trim();

    // Vérifier si l'action est "continue"
    const actionStart = content.indexOf('action="', fileStart);
    const hasAction =
      actionStart !== -1 && actionStart < content.indexOf(">", fileStart);
    const actionEnd = hasAction ? content.indexOf('"', actionStart + 8) : -1;
    const action = hasAction ? content.slice(actionStart + 8, actionEnd) : null;
    const isContinue = action === "continue";
    const isDelete = action === "delete";

    const fileContentStart = content.indexOf(">", nameEnd);
    if (fileContentStart === -1) break;

    const fileContentEnd = content.indexOf(
      "</tailwindaiFile>",
      fileContentStart,
    );
    // Si on ne trouve pas la fin du fichier, on considère qu'il est incomplet
    const isIncomplete = fileContentEnd === -1;

    // Pour un fichier incomplet, on prend tout le contenu restant
    let fileContent = isIncomplete
      ? content.slice(fileContentStart + 1)
      : content.slice(fileContentStart + 1, fileContentEnd);

    // Vérifier si le contenu contient un marqueur FINISH_REASON
    const hasFinishReasonMarker =
      fileContent.includes("<!-- FINISH_REASON: length -->") ||
      fileContent.includes("<!-- FINISH_REASON: error -->");

    // Nettoyer le contenu des marqueurs de fin si nécessaire
    if (hasFinishReasonMarker) {
      fileContent = fileContent
        .replace(/\n\n<!-- FINISH_REASON: (?:length|error) -->$/, "")
        .trim();
    }

    files.push({
      name: fileName,
      content: fileContent.trim(),
      isIncomplete: isIncomplete || hasFinishReasonMarker,
      isDelete: isDelete,
      isActive: false,
      isContinue: isContinue,
    });

    currentIndex = isIncomplete
      ? content.length
      : fileContentEnd + "</tailwindaiFile>".length;
  }

  return files;
}

export const extractFilesFromCompletion = (completion: string): ChatFile[] => {
  if (!completion) return [];

  // Essayer d'abord avec l'extraction directe qui est plus robuste avec le formatage TypeScript
  const directFiles = extractDirectFiles(completion);
  if (directFiles.length > 0) {
    return directFiles;
  }

  // Si aucun fichier n'est trouvé avec la méthode directe, continuer avec la méthode existante
  const filesArray: ChatFile[] = [];

  // Identification préliminaire des balises tailwindaiFile
  const hasOpeningTag = completion.includes("<tailwindaiFile");

  // Si aucune balise tailwindaiFile n'est trouvée, retourner un tableau vide
  if (!hasOpeningTag) {
    return [];
  }

  // Expression régulière plus robuste pour capturer les balises tailwindaiFile avec leur contenu
  // Cette regex est plus tolérante aux sauts de ligne et aux espaces dans les attributs
  const fileRegex =
    /<tailwindaiFile\s+name=["']([^"']*?)["'](?:\s+action=["']([^"']*?)["'])?[^>]*>([\s\S]*?)(?:<\/tailwindaiFile>|$)/g;

  let fileMatch;
  while ((fileMatch = fileRegex.exec(completion)) !== null) {
    const fileName = fileMatch[1];
    const action = fileMatch[2];
    let content = fileMatch[3];

    // Vérifier si le contenu est vide ou ne contient que des espaces
    if (!content || content.trim().length === 0) {
      continue;
    }

    // Nettoyage du contenu
    content = content
      .replace(/<\/tailwindaiFile>[\s\S]*$/g, "") // Supprimer la balise fermante et tout ce qui suit
      .replace(/<\/tailwindaiArtifact>[\s\S]*$/g, "")
      .trim();

    // Traitement de l'indentation
    const lines = content.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

    if (nonEmptyLines.length === 0) {
      continue; // Ignorer les fichiers sans contenu réel
    }

    // Détection de présence de marqueurs FINISH_REASON
    const hasFinishReasonMarker =
      content.includes("<!-- FINISH_REASON: length -->") ||
      content.includes("<!-- FINISH_REASON: error -->");

    // Vérifier si le fichier est complet (balise fermante présente)
    const isComplete = completion.includes(`</tailwindaiFile>`);

    // Déterminer si le fichier est incomplet (pas de balise fermante ou présence d'un marqueur FINISH_REASON)
    const isIncomplete = !isComplete || hasFinishReasonMarker;

    // Ajustement des indentations pour un affichage propre
    const indentations = nonEmptyLines.map((line) => {
      const match = line.match(/^[ \t]*/);
      return match ? match[0].length : 0;
    });

    const minIndent = Math.min(...indentations);

    // Appliquer l'indentation minimale à toutes les lignes
    content = lines
      .map((line) => (line.length >= minIndent ? line.slice(minIndent) : line))
      .join("\n")
      .trim();

    filesArray.push({
      name: fileName || null,
      content: content,
      isDelete: action === "delete",
      isActive: false,
      isContinue: action === "continue",
      isIncomplete: isIncomplete,
    });
  }

  // Si aucun fichier n'a été trouvé avec la regex précédente, tenter une approche plus agressive
  if (filesArray.length === 0 && hasOpeningTag) {
    // Extraire toutes les sections commençant par <tailwindaiFile et allant jusqu'à la fin du texte
    // ou jusqu'à la prochaine balise tailwindaiFile
    const lastFileStartIndex = completion.lastIndexOf("<tailwindaiFile");

    if (lastFileStartIndex !== -1) {
      const nameMatch = completion
        .slice(lastFileStartIndex)
        .match(/name=["']([^"']*?)["']/);
      const actionMatch = completion
        .slice(lastFileStartIndex)
        .match(/action=["']([^"']*?)["']/);

      let content = completion.slice(lastFileStartIndex);

      // Extraire le contenu après la balise d'ouverture
      const openTagEndIndex = content.indexOf(">");

      if (openTagEndIndex !== -1) {
        content = content.slice(openTagEndIndex + 1).trim();

        // Nettoyer le contenu
        const cleanedContent = content
          .replace(/<\/tailwindaiFile>[\s\S]*$/g, "")
          .replace(/<\/tailwindaiArtifact>[\s\S]*$/g, "")
          .trim();

        if (cleanedContent && cleanedContent.length > 0) {
          filesArray.push({
            name: nameMatch ? nameMatch[1] : null,
            content: cleanedContent,
            isDelete: actionMatch ? actionMatch[1] === "delete" : false,
            isActive: false,
            isContinue: actionMatch ? actionMatch[1] === "continue" : false,
            isIncomplete: true,
          });
        }
      }
    }
  }

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
        isIncomplete: isIncomplete,
        isContinue: action === "continue",
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
    /<tailwindaiFile.*?name=["']([^"']*?)["'].*?(?:action=["']([^"']*?)["'].*?)?>([\s\S]*?)(?=<\/tailwindaiFile>|<tailwindaiFile|$)/g;

  let fileMatch;
  while ((fileMatch = fileRegex.exec(incompleteArtifactContent)) !== null) {
    const fileName = fileMatch[1];
    const action = fileMatch[2];
    let content = fileMatch[3].trim();

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
      isDelete: action === "delete",
      isActive: false,
      isIncomplete: isIncomplete,
      isContinue: action === "continue",
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
  // Vérifier d'abord s'il y a des balises tailwindaiFile directes sans artifact
  if (
    completion.includes("<tailwindaiFile") &&
    !completion.includes("<tailwindaiArtifact")
  ) {
    // Si nous pouvons extraire des fichiers directement, considérer comme un artifact
    const directFiles = extractDirectFiles(completion);
    if (directFiles.length > 0) {
      return true;
    }
  }

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

export function splitCompletedContentIntoChunks(
  content: string,
): ContentChunk[] {
  // Si le contenu est vide, renvoyer un tableau vide
  if (!content || !content.trim()) {
    return [];
  }

  // 1. Si le contenu contient des artifacts déjà formatés, les extraire
  if (
    content.includes("<tailwindaiArtifact") &&
    content.includes("</tailwindaiArtifact>")
  ) {
    const chunks: ContentChunk[] = [];
    const artifactRegex = /<tailwindaiArtifact[\s\S]*?<\/tailwindaiArtifact>/g;
    let artifactMatch;
    let lastIndex = 0;

    while ((artifactMatch = artifactRegex.exec(content)) !== null) {
      // Ajouter le texte avant l'artifact s'il y en a
      const textBefore = content.slice(lastIndex, artifactMatch.index).trim();
      if (textBefore) {
        chunks.push({
          type: "text",
          content: textBefore,
        });
      }

      // Ajouter l'artifact
      chunks.push({
        type: "artifact",
        content: artifactMatch[0],
      });

      lastIndex = artifactMatch.index + artifactMatch[0].length;
    }

    // Ajouter le texte après le dernier artifact s'il y en a
    const textAfter = content.slice(lastIndex).trim();
    if (textAfter) {
      chunks.push({
        type: "text",
        content: textAfter,
      });
    }

    return chunks;
  }

  // 2. Si le contenu contient des fichiers mais pas d'artifacts, créer un artifact
  if (content.includes("<tailwindaiFile")) {
    // Extraire tous les fichiers
    const filesRegex = /<tailwindaiFile[\s\S]*?<\/tailwindaiFile>/g;
    let filesMatch;
    const files = [];

    // Collecter tous les fichiers
    while ((filesMatch = filesRegex.exec(content)) !== null) {
      files.push(filesMatch[0]);
    }

    // Si on a trouvé des fichiers complets, créer un artifact avec eux
    if (files.length > 0) {
      return [
        {
          type: "artifact",
          content: `<tailwindaiArtifact title="Generated Files">${files.join("\n")}</tailwindaiArtifact>`,
        },
      ];
    }

    // Si on n'a pas trouvé de fichiers complets mais il y a des balises tailwindaiFile,
    // c'est probablement un fichier incomplet
    if (content.includes("<tailwindaiFile")) {
      return [
        {
          type: "artifact",
          content: `<tailwindaiArtifact title="Generated Files">${content}</tailwindaiArtifact>`,
        },
      ];
    }
  }

  // 3. Si c'est juste du texte, renvoyer un seul chunk text
  return [
    {
      type: "text",
      content: content.trim(),
    },
  ];
}

export const splitContentIntoChunks = (completion: string): ContentChunk[] => {
  if (!completion) return [];

  // Vérifier d'abord s'il y a des balises tailwindaiFile dans le contenu
  const hasTailwindaiFile = completion.includes("<tailwindaiFile");

  // Si le contenu contient des balises tailwindaiFile mais pas d'artefact complet,
  // considérer le contenu entier comme un artefact pour une meilleure visualisation
  if (hasTailwindaiFile && !completion.includes("<tailwindaiArtifact")) {
    // Si on peut extraire des fichiers directement, traiter comme un artefact
    const directFiles = extractDirectFiles(completion);
    if (directFiles.length > 0) {
      return [
        {
          type: "artifact",
          content: completion,
        },
      ];
    }
  }

  const chunks: ContentChunk[] = [];

  // Expression régulière pour détecter les balises tailwindaiFile et tailwindaiArtifact
  const combinedPattern =
    /(<tailwindaiArtifact[^>]*>[\s\S]*?<\/tailwindaiArtifact>|<tailwindaiArtifact[^>]*>[\s\S]*?$|<tailwindaiFile[^>]*>[\s\S]*?<\/tailwindaiFile>|<tailwindaiFile[^>]*>[\s\S]*?$)/g;

  // Diviser le texte en segments basés sur les balises trouvées
  const segments = completion.split(combinedPattern);

  // Trouver toutes les correspondances aux balises
  const matches = [];
  let matchResult;
  while ((matchResult = combinedPattern.exec(completion)) !== null) {
    matches.push(matchResult[0]);
  }

  // Traiter chaque segment
  for (let i = 0; i < segments.length; i++) {
    // Les segments pairs sont du texte normal, les segments impairs sont remplacés par les matches
    if (i % 2 === 0) {
      if (segments[i].trim()) {
        chunks.push({
          type: "text",
          content: segments[i].trim(),
        });
      }
    } else {
      const matchIndex = Math.floor(i / 2);
      if (matchIndex < matches.length) {
        chunks.push({
          type: "artifact",
          content: matches[matchIndex],
        });
      }
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
    const fileName = match[1].trim();
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
    const previousFileKey = Array.from(previousFiles.keys()).find(
      (key) => key.toLowerCase() === fileName.toLowerCase(),
    );

    if (previousFileKey && previousFiles.get(previousFileKey) !== content) {
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
