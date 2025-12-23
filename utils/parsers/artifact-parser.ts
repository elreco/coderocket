import {
  isPatchFormat,
  isUnifiedDiffFormat,
  cleanUnifiedDiffContent,
  detectAndCleanMalformedDiff,
} from "../patch-applier";

const TAILWIND_SCRIPT_CDN =
  '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>';
const DAISYUI_CDN =
  '<link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet">\n' +
  '<link href="https://cdn.jsdelivr.net/npm/daisyui@5/themes.css" rel="stylesheet" type="text/css" />';

export const getUpdatedArtifactCode = (
  completion: string,
  artifactCode: string,
): string => {
  const titleMatch = artifactCode.match(
    /<coderocketArtifact\s+title=["']([^"']*?)["']/,
  );
  let artifactTitle = titleMatch ? titleMatch[1] : "Untitled";

  const newTitleMatch = completion.match(
    /<coderocketArtifact\s+title=["']([^"']*?)["']/,
  );
  if (newTitleMatch) {
    artifactTitle = newTitleMatch[1];
  }

  const allFiles = new Map();
  const filesToDelete = new Set();
  const lockedFiles = new Set<string>();

  const existingFileRegex =
    /<coderocketFile.*?name=["']([^"']*?)["'](?:.*?locked=["']([^"']*?)["'])?[^>]*>([\s\S]*?)<\/coderocketFile>/g;
  let existingMatch;
  while ((existingMatch = existingFileRegex.exec(artifactCode)) !== null) {
    const fileName = existingMatch[1];
    const locked = existingMatch[2];
    const content = existingMatch[3].trim();

    const cleanedContent = content.replace(
      /\n\n<!-- FINISH_REASON: (?:length|error) -->$/,
      "",
    );
    allFiles.set(fileName, cleanedContent);
    if (locked === "true") {
      lockedFiles.add(fileName);
    }
  }

  const fileRegex =
    /<coderocketFile.*?name=["']([^"']*?)["'].*?(?:action=["']([^"']*?)["'].*?)?>([\s\S]*?)(?=<\/coderocketFile|<coderocketFile|$)/g;
  let match;

  while ((match = fileRegex.exec(completion)) !== null) {
    const fileName = match[1];
    const action = match[2];
    let content = match[3].trim();

    content = content
      .replace(/<\/coderocketFile>\s*$/gm, "")
      .replace(/<\/coderocketArtifact>\s*$/gm, "")
      .replace(/^\s*$\n/gm, "")
      .trim();

    if (action === "delete") {
      filesToDelete.add(fileName);
    } else if (action === "continue") {
      const normalizedFileName = fileName.trim();
      const existingFileKey =
        Array.from(allFiles.keys()).find((key) => key === normalizedFileName) ||
        Array.from(allFiles.keys()).find(
          (key) => key.toLowerCase() === normalizedFileName.toLowerCase(),
        );

      if (existingFileKey) {
        const existingContent = allFiles.get(existingFileKey);
        const cleanedExistingContent = existingContent.replace(
          /\n\n<!-- FINISH_REASON: (?:length|error) -->$/,
          "",
        );

        const newContent = concatenateContent(cleanedExistingContent, content);
        allFiles.set(existingFileKey, newContent);
      } else {
        console.warn(
          `File not found for continue action: ${normalizedFileName}. Creating new file.`,
        );
        allFiles.set(normalizedFileName, content);
      }
    } else if (content) {
      if (isPatchFormat(content)) {
        console.warn(
          `[Parser] PATCH_V1 format detected for "${fileName}" but patches are no longer supported. Ignoring patch.`,
        );
        continue;
      }

      if (isUnifiedDiffFormat(content)) {
        console.warn(
          `[Parser] Unified diff format detected for "${fileName}". Attempting to clean and extract content.`,
        );
        const cleanedContent = cleanUnifiedDiffContent(content);
        if (cleanedContent && cleanedContent.trim() !== "") {
          content = cleanedContent;
        } else {
          console.warn(
            `[Parser] Could not extract valid content from unified diff for "${fileName}". Ignoring.`,
          );
          continue;
        }
      }

      const hasDiffMarkers =
        content.includes("\n- ") ||
        content.includes("\n+ ") ||
        content
          .split("\n")
          .some(
            (line) =>
              (line.startsWith("-") && !line.startsWith("--")) ||
              (line.startsWith("+") && !line.startsWith("++")),
          );

      if (hasDiffMarkers) {
        console.warn(
          `[Parser] Detected diff-like markers in "${fileName}". Attempting to clean malformed diff format.`,
        );
        content = detectAndCleanMalformedDiff(content);
      }

      const normalizedFileName = fileName.trim();
      const existingFileKey =
        Array.from(allFiles.keys()).find((key) => key === normalizedFileName) ||
        Array.from(allFiles.keys()).find(
          (key) => key.toLowerCase() === normalizedFileName.toLowerCase(),
        );

      if (existingFileKey) {
        if (lockedFiles.has(existingFileKey)) {
          console.warn(
            `[Patch] Cannot modify locked file "${existingFileKey}". Content update will be ignored.`,
          );
          continue;
        }

        const existingContent = allFiles.get(existingFileKey);
        const hadFinishReason = existingContent.includes("<!-- FINISH_REASON:");

        if (hadFinishReason) {
          const cleanedExistingContent = existingContent.replace(
            /\n\n<!-- FINISH_REASON: (?:length|error) -->$/,
            "",
          );
          const newContent = concatenateContent(cleanedExistingContent, content);
          allFiles.set(existingFileKey, newContent);
        } else {
          allFiles.set(existingFileKey, content);
        }
      } else {
        allFiles.set(normalizedFileName, content);
      }
    }
  }

  let mergedArtifact = `<coderocketArtifact title="${artifactTitle}">\n`;
  allFiles.forEach((content, fileName) => {
    if (!filesToDelete.has(fileName)) {
      if (!fileName || fileName.trim() === "") {
        console.warn(
          `[Patch] Skipping file with empty or invalid name in artifact code`,
        );
        return;
      }

      const sanitizedFileName = fileName.replace(/["'<>]/g, "").trim();
      if (sanitizedFileName !== fileName) {
        console.warn(
          `[Patch] Sanitized file name "${fileName}" to "${sanitizedFileName}"`,
        );
      }

      const sanitizedContent = content || "";
      const lockedAttr = lockedFiles.has(fileName) ? ' locked="true"' : "";
      mergedArtifact += `<coderocketFile name="${sanitizedFileName}"${lockedAttr}>\n${sanitizedContent}\n</coderocketFile>\n`;
    }
  });
  mergedArtifact += "</coderocketArtifact>";

  if (!mergedArtifact.includes("<coderocketFile")) {
    console.warn(
      `[Patch] Generated artifact code has no files. This may indicate a problem.`,
    );
  }

  return mergedArtifact;
};

function concatenateContent(existingContent: string, newContent: string): string {
  const lastCharExisting = existingContent.charAt(existingContent.length - 1);
  const firstCharNew = newContent.charAt(0);

  for (let overlap = 50; overlap >= 3; overlap--) {
    if (existingContent.length >= overlap) {
      const endOfExisting = existingContent.slice(-overlap);

      if (newContent.startsWith(endOfExisting)) {
        return existingContent + newContent.slice(overlap);
      }

      for (let i = Math.min(overlap - 1, 20); i >= 3; i--) {
        const partialEnd = existingContent.slice(-i);
        if (newContent.startsWith(partialEnd)) {
          return existingContent + newContent.slice(i);
        }
      }
    }
  }

  if (lastCharExisting === "" || firstCharNew === "") {
    return existingContent + newContent;
  } else if (existingContent.endsWith("\n") || newContent.startsWith("\n")) {
    if (existingContent.endsWith("\n") && newContent.startsWith("\n")) {
      return existingContent + newContent.substring(1);
    } else {
      return existingContent + newContent;
    }
  } else if (
    /[\s.,;:!?)\]}]$/.test(lastCharExisting) ||
    /[\s({[]/.test(firstCharNew)
  ) {
    return existingContent + newContent;
  } else if (/[\w]$/.test(lastCharExisting) && /[\w]/.test(firstCharNew)) {
    return existingContent + newContent;
  } else {
    const lastFewChars = existingContent.slice(-10);
    if (
      lastFewChars.includes('"') ||
      lastFewChars.includes("'") ||
      lastFewChars.includes("<") ||
      lastFewChars.includes("{") ||
      lastFewChars.includes("(")
    ) {
      return existingContent + newContent;
    } else {
      return existingContent + " " + newContent;
    }
  }
}

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
