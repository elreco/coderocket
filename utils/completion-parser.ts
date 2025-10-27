import { Tables } from "@/types_db";

import { defaultTheme } from "./config";

const TAILWIND_SCRIPT_CDN =
  '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>';
const DAISYUI_CDN =
  '<link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet">\n' +
  '<link href="https://cdn.jsdelivr.net/npm/daisyui@5/themes.css" rel="stylesheet" type="text/css" />';

// Ajoutez cette nouvelle interface et fonction
export interface ContentChunk {
  type: "text" | "artifact" | "thinking";
  content: string;
}

export interface ChatFile {
  name: string | null;
  content: string;
  isDelete?: boolean;
  isActive: boolean;
  isIncomplete?: boolean;
  isContinue?: boolean;
  isLocked?: boolean;
}

export interface ChatMessage {
  id: string | number;
  role: "user" | "assistant" | "system";
  content: string;
  version: number;
  created_at: string;
  chats?: {
    user?: Record<string, unknown>;
    prompt_image?: string | null;
    remix_chat_id?: string | null;
  };
  ai_prompt?: string;
}

// FIXED: Remove global state variables that cause corruption between calls
// let previousFiles = new Map<string, string>(); // Pour stocker l'état précédent
// let lastActiveFile: string | null = null; // Pour stocker le nom du dernier fichier actif

export const getUpdatedArtifactCode = (
  completion: string,
  artifactCode: string,
): string => {
  // Récupération du titre depuis l'artifact existant
  const titleMatch = artifactCode.match(
    /<coderocketArtifact\s+title=["']([^"']*?)["']/,
  );
  let artifactTitle = titleMatch ? titleMatch[1] : "Untitled"; // Valeur par défaut

  // Extraction du titre depuis la nouvelle réponse si disponible
  const newTitleMatch = completion.match(
    /<coderocketArtifact\s+title=["']([^"']*?)["']/,
  );
  if (newTitleMatch) {
    artifactTitle = newTitleMatch[1];
  }

  // Parse existing files from artifactCode
  const allFiles = new Map();
  const filesToDelete = new Set();
  const lockedFiles = new Set<string>();

  // Extract existing files and locked status
  const existingFileRegex =
    /<coderocketFile.*?name=["']([^"']*?)["'](?:.*?locked=["']([^"']*?)["'])?[^>]*>([\s\S]*?)<\/coderocketFile>/g;
  let existingMatch;
  while ((existingMatch = existingFileRegex.exec(artifactCode)) !== null) {
    const fileName = existingMatch[1];
    const locked = existingMatch[2];
    const content = existingMatch[3].trim();

    // Supprimer le marqueur FINISH_REASON s'il existe
    const cleanedContent = content.replace(
      /\n\n<!-- FINISH_REASON: (?:length|error) -->$/,
      "",
    );
    allFiles.set(fileName, cleanedContent);
    if (locked === "true") {
      lockedFiles.add(fileName);
    }
  }

  // Extract new/updated files from completion, including partial ones
  const fileRegex =
    /<coderocketFile.*?name=["']([^"']*?)["'].*?(?:action=["']([^"']*?)["'].*?)?>([\s\S]*?)(?=<\/coderocketFile|<coderocketFile|$)/g;
  let match;

  while ((match = fileRegex.exec(completion)) !== null) {
    const fileName = match[1];
    const action = match[2];
    let content = match[3].trim();

    // FIXED: Safe content cleaning without destroying legitimate content
    content = content
      .replace(/<\/coderocketFile>\s*$/gm, "") // Only remove closing tags at end of line
      .replace(/<\/coderocketArtifact>\s*$/gm, "") // Only remove closing tags at end of line
      .replace(/^\s*$\n/gm, "") // Remove empty lines
      .trim();

    if (action === "delete") {
      filesToDelete.add(fileName);
    } else if (action === "continue") {
      // FIXED: Exact name matching to prevent file confusion
      const normalizedFileName = fileName.trim();
      // Check if the file exists with EXACT name (case sensitive) first
      const existingFileKey =
        Array.from(allFiles.keys()).find((key) => key === normalizedFileName) ||
        Array.from(allFiles.keys()).find(
          (key) => key.toLowerCase() === normalizedFileName.toLowerCase(),
        );

      if (existingFileKey) {
        const existingContent = allFiles.get(existingFileKey);
        // Nettoyer le contenu existant de tout marqueur de fin
        const cleanedExistingContent = existingContent.replace(
          /\n\n<!-- FINISH_REASON: (?:length|error) -->$/,
          "",
        );

        // Analyse plus précise pour déterminer s'il faut ajouter un espace ou non
        // 1. Vérifier le dernier caractère du contenu existant
        const lastCharExisting = cleanedExistingContent.charAt(
          cleanedExistingContent.length - 1,
        );
        // 2. Vérifier le premier caractère du nouveau contenu
        const firstCharNew = content.charAt(0);

        // Détecter et éviter les duplications de contenu
        let newContent = "";

        // Vérifier si le nouveau contenu commence par une répétition de la fin du contenu existant
        let duplicationFound = false;

        // Vérifier jusqu'à 50 caractères pour les duplications potentielles
        for (let overlap = 50; overlap >= 3; overlap--) {
          if (cleanedExistingContent.length >= overlap) {
            const endOfExisting = cleanedExistingContent.slice(-overlap);

            // Si le nouveau contenu commence par cette séquence, nous avons une duplication
            if (content.startsWith(endOfExisting)) {
              // Supprimer la duplication du nouveau contenu
              newContent = cleanedExistingContent + content.slice(overlap);
              duplicationFound = true;
              break;
            }

            // Détection de duplication partielle (mot coupé)
            for (let i = Math.min(overlap - 1, 20); i >= 3; i--) {
              const partialEnd = cleanedExistingContent.slice(-i);

              if (content.startsWith(partialEnd)) {
                newContent = cleanedExistingContent + content.slice(i);
                duplicationFound = true;
                break;
              }
            }

            if (duplicationFound) break;
          }
        }

        // Si aucune duplication n'a été trouvée, utiliser la logique standard
        if (!duplicationFound) {
          // Règles de concaténation améliorées
          if (lastCharExisting === "" || firstCharNew === "") {
            // L'un des deux est vide, concaténation simple
            newContent = cleanedExistingContent + content;
          } else if (
            cleanedExistingContent.endsWith("\n") ||
            content.startsWith("\n")
          ) {
            // Si l'un des deux a un retour à la ligne, concaténer directement
            // en supprimant un retour à la ligne superflu si les deux en ont un
            if (
              cleanedExistingContent.endsWith("\n") &&
              content.startsWith("\n")
            ) {
              newContent = cleanedExistingContent + content.substring(1);
            } else {
              newContent = cleanedExistingContent + content;
            }
          } else if (
            /[\s.,;:!?)\]}]$/.test(lastCharExisting) ||
            /[\s({[]/.test(firstCharNew)
          ) {
            // Si le dernier char est un espace ou ponctuation finale, ou le premier est un espace ou ponctuation début
            // concaténer directement sans ajouter d'espace
            newContent = cleanedExistingContent + content;
          } else if (
            /[\w]$/.test(lastCharExisting) &&
            /[\w]/.test(firstCharNew)
          ) {
            // Si on a deux caractères alphanumériques qui se suivent (possible milieu de mot)
            // concaténer directement sans ajouter d'espace
            newContent = cleanedExistingContent + content;
          } else {
            // Dans les autres cas, ajouter un espace entre les deux contenus
            // sauf si on est dans un contexte de code (HTML, JS, etc.) où des éléments pourraient être joints
            // Vérification de contexte de code
            const lastFewChars = cleanedExistingContent.slice(-10);
            if (
              lastFewChars.includes('"') ||
              lastFewChars.includes("'") ||
              lastFewChars.includes("<") ||
              lastFewChars.includes("{") ||
              lastFewChars.includes("(")
            ) {
              // Dans un contexte de code, concaténer directement
              newContent = cleanedExistingContent + content;
            } else {
              // Ajouter un espace dans les autres cas
              newContent = cleanedExistingContent + " " + content;
            }
          }
        }

        allFiles.set(existingFileKey, newContent);
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

          // Utiliser la même logique améliorée que pour la continuation
          const lastCharExisting = cleanedExistingContent.charAt(
            cleanedExistingContent.length - 1,
          );
          const firstCharNew = content.charAt(0);

          let newContent = "";

          // Vérifier les duplications comme ci-dessus
          let duplicationFound = false;

          for (let overlap = 50; overlap >= 3; overlap--) {
            if (cleanedExistingContent.length >= overlap) {
              const endOfExisting = cleanedExistingContent.slice(-overlap);

              if (content.startsWith(endOfExisting)) {
                newContent = cleanedExistingContent + content.slice(overlap);
                duplicationFound = true;
                break;
              }

              for (let i = Math.min(overlap - 1, 20); i >= 3; i--) {
                const partialEnd = cleanedExistingContent.slice(-i);

                if (content.startsWith(partialEnd)) {
                  newContent = cleanedExistingContent + content.slice(i);
                  duplicationFound = true;
                  break;
                }
              }

              if (duplicationFound) break;
            }
          }

          if (!duplicationFound) {
            if (lastCharExisting === "" || firstCharNew === "") {
              newContent = cleanedExistingContent + content;
            } else if (
              cleanedExistingContent.endsWith("\n") ||
              content.startsWith("\n")
            ) {
              if (
                cleanedExistingContent.endsWith("\n") &&
                content.startsWith("\n")
              ) {
                newContent = cleanedExistingContent + content.substring(1);
              } else {
                newContent = cleanedExistingContent + content;
              }
            } else if (
              /[\s.,;:!?)\]}]$/.test(lastCharExisting) ||
              /[\s({[]/.test(firstCharNew)
            ) {
              newContent = cleanedExistingContent + content;
            } else if (
              /[\w]$/.test(lastCharExisting) &&
              /[\w]/.test(firstCharNew)
            ) {
              newContent = cleanedExistingContent + content;
            } else {
              const lastFewChars = cleanedExistingContent.slice(-10);
              if (
                lastFewChars.includes('"') ||
                lastFewChars.includes("'") ||
                lastFewChars.includes("<") ||
                lastFewChars.includes("{") ||
                lastFewChars.includes("(")
              ) {
                newContent = cleanedExistingContent + content;
              } else {
                newContent = cleanedExistingContent + " " + content;
              }
            }
          }

          allFiles.set(fileName, newContent);
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
  let mergedArtifact = `<coderocketArtifact title="${artifactTitle}">\n`;
  allFiles.forEach((content, fileName) => {
    if (!filesToDelete.has(fileName)) {
      const lockedAttr = lockedFiles.has(fileName) ? ' locked="true"' : "";
      mergedArtifact += `<coderocketFile name="${fileName}"${lockedAttr}>\n${content}\n</coderocketFile>\n`;
    }
  });
  mergedArtifact += "</coderocketArtifact>";

  return mergedArtifact;
};

export const toggleFileLock = (
  artifactCode: string,
  filePath: string,
): string => {
  const fileRegex = new RegExp(
    `<coderocketFile([^>]*?)name=["']${filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']([^>]*?)>([\\s\\S]*?)</coderocketFile>`,
    "g",
  );

  return artifactCode.replace(fileRegex, (match, before, after, content) => {
    const hasLocked = /locked=["']true["']/.test(before + after);
    if (hasLocked) {
      const beforeCleaned = before
        .replace(/\s*locked=["']true["']\s*/, " ")
        .trim();
      const afterCleaned = after
        .replace(/\s*locked=["']true["']\s*/, " ")
        .trim();
      const beforeSpace = beforeCleaned ? ` ${beforeCleaned}` : "";
      const afterSpace = afterCleaned ? ` ${afterCleaned}` : "";
      return `<coderocketFile${beforeSpace} name="${filePath}"${afterSpace}>${content}</coderocketFile>`;
    } else {
      return `<coderocketFile${before}name="${filePath}"${after} locked="true">${content}</coderocketFile>`;
    }
  });
};

export const ensureCDNsPresent = (htmlContent: string): string => {
  let updatedContent = htmlContent;

  if (!htmlContent.includes("cdn.jsdelivr.net/npm/@tailwindcss/browser@4")) {
    updatedContent += `\n${TAILWIND_SCRIPT_CDN}`;
  }

  if (!htmlContent.includes("cdn.jsdelivr.net/npm/daisyui@5")) {
    updatedContent += `\n${DAISYUI_CDN}`;
  }

  return updatedContent;
};

// Nouvelle fonction pour extraire directement les fichiers, même mal formatés
export function extractDirectFiles(content: string): ChatFile[] {
  if (!content || !content.includes("<coderocketFile")) {
    return [];
  }

  const files: ChatFile[] = [];
  let currentIndex = 0;

  while (currentIndex < content.length) {
    const fileStart = content.indexOf("<coderocketFile", currentIndex);
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
      "</coderocketFile>",
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
      : fileContentEnd + "</coderocketFile>".length;
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

  // Identification préliminaire des balises coderocketFile
  const hasOpeningTag = completion.includes("<coderocketFile");

  // Si aucune balise coderocketFile n'est trouvée, retourner un tableau vide
  if (!hasOpeningTag) {
    return [];
  }

  // Expression régulière plus robuste pour capturer les balises coderocketFile avec leur contenu
  // Cette regex est plus tolérante aux sauts de ligne et aux espaces dans les attributs
  const fileRegex =
    /<coderocketFile\s+name=["']([^"']*?)["'](?:\s+action=["']([^"']*?)["'])?[^>]*>([\s\S]*?)(?:<\/coderocketFile>|$)/g;

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
      .replace(/<\/coderocketFile>[\s\S]*$/g, "") // Supprimer la balise fermante et tout ce qui suit
      .replace(/<\/coderocketArtifact>[\s\S]*$/g, "")
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
    const isComplete = completion.includes(`</coderocketFile>`);

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
    // Extraire toutes les sections commençant par <coderocketFile et allant jusqu'à la fin du texte
    // ou jusqu'à la prochaine balise coderocketFile
    const lastFileStartIndex = completion.lastIndexOf("<coderocketFile");

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
          .replace(/<\/coderocketFile>[\s\S]*$/g, "")
          .replace(/<\/coderocketArtifact>[\s\S]*$/g, "")
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
    completion.includes("<coderocketArtifact") &&
    completion.includes("</coderocketArtifact>");
  const hasPartialArtifactTags =
    completion.includes("<coderocketArtifact") &&
    !completion.includes("</coderocketArtifact>");
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
  const artifactRegex = /<coderocketArtifact[\s\S]*?<\/coderocketArtifact>/g;

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
      /<coderocketFile.*?name=["']([^"']*?)["'].*?(?:action=["']([^"']*?)["'].*?)?>([\s\S]*?)(?=<\/coderocketFile>|<coderocketFile|$)/g;

    let fileMatch;
    while ((fileMatch = fileRegex.exec(artifactContent)) !== null) {
      const fileName = fileMatch[1];
      const action = fileMatch[2];
      let content = fileMatch[3].trim();

      // Si on trouve une balise fermante pour ce fichier, on l'utilise comme limite
      const closeTagIndex = content.indexOf("</coderocketFile>");
      if (closeTagIndex !== -1) {
        content = content.slice(0, closeTagIndex);
      }

      // Nettoyage du contenu
      content = content
        .replace(/<\/coderocketFile>/g, "")
        .replace(/<\/coderocketArtifact>/g, "")
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
  const artifactStartIndex = completion.lastIndexOf("<coderocketArtifact");
  if (artifactStartIndex === -1) {
    return [];
  }

  // Extraire le contenu de l'artifact incomplet
  const incompleteArtifactContent = completion.slice(artifactStartIndex);

  // Regex pour trouver les fichiers dans l'artifact incomplet
  // Cette regex est plus permissive pour capturer les fichiers même dans un artifact incomplet
  const fileRegex =
    /<coderocketFile.*?name=["']([^"']*?)["'].*?(?:action=["']([^"']*?)["'].*?)?>([\s\S]*?)(?=<\/coderocketFile>|<coderocketFile|$)/g;

  let fileMatch;
  while ((fileMatch = fileRegex.exec(incompleteArtifactContent)) !== null) {
    const fileName = fileMatch[1];
    const action = fileMatch[2];
    let content = fileMatch[3].trim();

    // Nettoyage du contenu
    content = content
      .replace(/<\/coderocketFile>/g, "")
      .replace(/<\/coderocketArtifact>/g, "")
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
  // Supprimer toute partie de texte commençant par <coderocket
  const withoutPartialArtifact = completion.replace(/<coderocket[^>]*$/g, "");

  // Remplacer temporairement les artifacts par un marqueur spécial
  let artifactCounter = 0;
  const artifacts: string[] = [];

  const textWithPlaceholders = withoutPartialArtifact.replace(
    /<coderocketArtifact>[\s\S]*?<\/coderocketArtifact>/g,
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
  return /<coderocketArtifact(?:\s+title=["']([^"']*?)["'])?>/i.test(
    completion,
  );
};

export const hasCompletedArtifacts = (completion: string): boolean => {
  // Vérifier d'abord s'il y a des balises coderocketFile directes sans artifact
  if (
    completion.includes("<coderocketFile") &&
    !completion.includes("<coderocketArtifact")
  ) {
    // Si nous pouvons extraire des fichiers directement, considérer comme un artifact
    const directFiles = extractDirectFiles(completion);
    if (directFiles.length > 0) {
      return true;
    }
  }

  // Vérifier si le contenu contient des balises d'artifact complètes ou partielles
  const hasCompleteArtifactTags =
    completion.includes("<coderocketArtifact") &&
    completion.includes("</coderocketArtifact>");
  const hasPartialArtifactTags =
    completion.includes("<coderocketArtifact") &&
    !completion.includes("</coderocketArtifact>");
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
  const artifactRegex = /<coderocketArtifact[\s\S]*?<\/coderocketArtifact>/g;

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
  return /<coderocketFile/i.test(completion);
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
    content.includes("<coderocketArtifact") &&
    content.includes("</coderocketArtifact>")
  ) {
    const chunks: ContentChunk[] = [];
    const artifactRegex = /<coderocketArtifact[\s\S]*?<\/coderocketArtifact>/g;
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
  if (content.includes("<coderocketFile")) {
    // Extraire tous les fichiers
    const filesRegex = /<coderocketFile[\s\S]*?<\/coderocketFile>/g;
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
          content: `<coderocketArtifact title="Generated Files">${files.join("\n")}</coderocketArtifact>`,
        },
      ];
    }

    // Si on n'a pas trouvé de fichiers complets mais il y a des balises coderocketFile,
    // c'est probablement un fichier incomplet
    if (content.includes("<coderocketFile")) {
      return [
        {
          type: "artifact",
          content: `<coderocketArtifact title="Generated Files">${content}</coderocketArtifact>`,
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

  // Vérifier d'abord s'il y a des balises coderocketFile dans le contenu
  const hasCoderocketFile = completion.includes("<coderocketFile");

  // Si le contenu contient des balises coderocketFile mais pas d'artefact complet,
  // considérer le contenu entier comme un artefact pour une meilleure visualisation
  if (hasCoderocketFile && !completion.includes("<coderocketArtifact")) {
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

  // Expression régulière pour détecter les balises thinking, coderocketFile et coderocketArtifact
  const combinedPattern =
    /(<thinking>[\s\S]*?<\/thinking>|<coderocketArtifact[^>]*>[\s\S]*?<\/coderocketArtifact>|<coderocketArtifact[^>]*>[\s\S]*?$|<coderocketFile[^>]*>[\s\S]*?<\/coderocketFile>|<coderocketFile[^>]*>[\s\S]*?$)/g;

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
        const match = matches[matchIndex];

        // Détecter si c'est une balise thinking
        if (match.startsWith("<thinking>")) {
          const thinkingContent = match.replace(/<\/?thinking>/g, "").trim();
          chunks.push({
            type: "thinking",
            content: thinkingContent,
          });
        } else {
          chunks.push({
            type: "artifact",
            content: match,
          });
        }
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
    /<coderocketArtifact\s+title=["']([^"']*?)["']/,
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

export const extractFilesFromArtifact = (
  artifactCode: string,
  previousArtifactCode?: string,
  currentCompletion?: string,
): ChatFile[] => {
  if (!artifactCode) return [];

  const filesArray: ChatFile[] = [];
  let activeFile: string | null = null;

  // Strategy: If we have the current completion being streamed, use it to detect the active file
  if (currentCompletion) {
    // Find the last file mentioned in the current completion (most likely being written)
    const fileMatches = Array.from(
      currentCompletion.matchAll(/<coderocketFile[^>]*name=["']([^"']*?)["']/g),
    );
    if (fileMatches.length > 0) {
      // The last file mentioned is most likely the one being worked on
      activeFile = fileMatches[fileMatches.length - 1][1];
    }
  }

  const fileRegex =
    /<coderocketFile.*?name=["']([^"']*?)["'](?:.*?action=["']([^"']*?)["'])?(?:.*?locked=["']([^"']*?)["'])?[^>]*>([\s\S]*?)(?=<\/coderocketFile>|<coderocketFile|$)/g;

  let match;
  while ((match = fileRegex.exec(artifactCode)) !== null) {
    const fileName = match[1].trim();
    const action = match[2];
    const locked = match[3];
    let content = match[4].trim();

    // Si on trouve une balise fermante pour ce fichier, on l'utilise comme limite
    const closeTagIndex = content.indexOf("</coderocketFile>");
    if (closeTagIndex !== -1) {
      content = content.slice(0, closeTagIndex);
    }

    // Nettoyer le contenu
    content = content
      .replace(/<\/coderocketFile>/g, "")
      .replace(/<\/coderocketArtifact>/g, "")
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

    // If no active file detected from streaming, fall back to simple logic
    if (!activeFile) {
      activeFile = fileName; // Last processed file as fallback
    }

    filesArray.push({
      name: fileName || null,
      content: content,
      isDelete: action === "delete",
      isActive: fileName === activeFile, // Mark as active if this is the detected file
      isLocked: locked === "true",
    });
  }

  return filesArray;
};

export const extractContentBeforeFinishReason = (
  content: string,
  contextLength: number = 200,
): string => {
  if (!content) return "Continue exactly where you left off";

  // Check if content contains FINISH_REASON markers
  const hasLengthMarker = content.includes("<!-- FINISH_REASON: length -->");
  const hasErrorMarker = content.includes("<!-- FINISH_REASON: error -->");

  if (!hasLengthMarker && !hasErrorMarker) {
    return "Continue exactly where you left off";
  }

  // Find the position of the marker
  const markerIndex = Math.max(
    content.lastIndexOf("<!-- FINISH_REASON: length -->"),
    content.lastIndexOf("<!-- FINISH_REASON: error -->"),
  );

  if (markerIndex <= 0) {
    return "Continue exactly where you left off";
  }

  // Get the content before the finish reason marker
  const contentBeforeMarker = content.substring(0, markerIndex).trim();

  // Extract the last 200 characters (or all if less than 200)
  const lastChars = contentBeforeMarker.substring(
    Math.max(0, contentBeforeMarker.length - contextLength),
  );

  // Identify the exact last line or code fragment
  // Find the last line break to make sure we're starting at a logical boundary
  let snippetStart = 0;
  const lastLineBreakIndex = lastChars.lastIndexOf("\n");

  if (lastLineBreakIndex !== -1) {
    // Get at least 2 lines if possible for better context
    const prevLineBreakIndex = lastChars.lastIndexOf(
      "\n",
      lastLineBreakIndex - 1,
    );
    if (
      prevLineBreakIndex !== -1 &&
      lastLineBreakIndex - prevLineBreakIndex < 100
    ) {
      snippetStart = prevLineBreakIndex + 1;
    } else {
      snippetStart = lastLineBreakIndex + 1;
    }
  }

  const contextSnippet = lastChars.substring(snippetStart);

  return `Continue exactly where you left off. Here's the exact end of the content: ${contextSnippet}`;
};

export const createContinuePrompt = (
  messages: Tables<"messages">[],
  contextLength: number = 200,
): string => {
  // Find the last assistant message
  const assistantMessages = messages.filter((msg) => msg.role === "assistant");
  const sortedAssistantMessages = assistantMessages.sort(
    (a, b) => a.version - b.version,
  );
  const lastAssistantMessage =
    sortedAssistantMessages.length > 0
      ? sortedAssistantMessages[sortedAssistantMessages.length - 1]
      : null;

  // Default prompt if no assistant message is found
  if (!lastAssistantMessage || !lastAssistantMessage.content) {
    return "Continue exactly where you left off";
  }

  // Extract context using existing function
  return extractContentBeforeFinishReason(
    lastAssistantMessage.content,
    contextLength,
  );
};
