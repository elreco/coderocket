import { ChatFile, CategorizedFiles } from "./types";
import { ensureCDNsPresent } from "./artifact-parser";

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

    const actionStart = content.indexOf('action="', fileStart);
    const hasAction =
      actionStart !== -1 &&
      actionStart < content.indexOf(">", fileStart) &&
      actionStart > fileStart;
    let action: string | null = null;

    if (hasAction) {
      const actionEnd = content.indexOf('"', actionStart + 8);
      if (actionEnd !== -1) {
        action = content.slice(actionStart + 8, actionEnd);
      }
    }

    const tagEnd = content.indexOf(">", nameEnd);
    if (tagEnd === -1) break;

    const nextFileTag = content.indexOf("<coderocketFile", tagEnd);
    const closeTag = content.indexOf("</coderocketFile>", tagEnd);

    let contentEnd: number;
    let isIncomplete = false;

    if (closeTag !== -1 && (nextFileTag === -1 || closeTag < nextFileTag)) {
      contentEnd = closeTag;
    } else if (nextFileTag !== -1) {
      contentEnd = nextFileTag;
      isIncomplete = true;
    } else {
      contentEnd = content.length;
      isIncomplete = true;
    }

    let fileContent = content.slice(tagEnd + 1, contentEnd).trim();

    fileContent = fileContent
      .replace(/<\/coderocketFile>/g, "")
      .replace(/<\/coderocketArtifact>/g, "")
      .trim();

    files.push({
      name: fileName || null,
      content: fileContent,
      isDelete: action === "delete",
      isActive: false,
      isIncomplete: isIncomplete,
      isContinue: action === "continue",
    });

    if (closeTag !== -1 && (nextFileTag === -1 || closeTag < nextFileTag)) {
      currentIndex = closeTag + "</coderocketFile>".length;
    } else if (nextFileTag !== -1) {
      currentIndex = nextFileTag;
    } else {
      break;
    }
  }

  if (files.length > 0) {
    files[files.length - 1].isActive = true;
  }

  return files;
}

export const extractFilesFromCompletion = (
  completion: string,
  isHtml = false,
): ChatFile[] => {
  const filesArray: ChatFile[] = [];

  if (!completion) return filesArray;

  const artifactMatches = completion.match(
    /<coderocketArtifact[\s\S]*?<\/coderocketArtifact>/g,
  );

  if (artifactMatches) {
    for (const artifact of artifactMatches) {
      const fileMatches = artifact.match(
        /<coderocketFile[^>]*>[\s\S]*?<\/coderocketFile>/g,
      );

      if (fileMatches) {
        for (const fileMatch of fileMatches) {
          const nameMatch = fileMatch.match(/name=["']([^"']*?)["']/);
          const actionMatch = fileMatch.match(/action=["']([^"']*?)["']/);
          const lockedMatch = fileMatch.match(/locked=["']([^"']*?)["']/);

          const fileName = nameMatch ? nameMatch[1].trim() : null;
          const action = actionMatch ? actionMatch[1] : null;
          const locked = lockedMatch ? lockedMatch[1] === "true" : false;

          let content = fileMatch
            .replace(/<coderocketFile[^>]*>/, "")
            .replace(/<\/coderocketFile>/, "")
            .trim();

          if (isHtml) {
            content = ensureCDNsPresent(content);
          }

          filesArray.push({
            name: fileName,
            content: content,
            isDelete: action === "delete",
            isActive: false,
            isContinue: action === "continue",
            isLocked: locked,
          });
        }
      }
    }

    if (filesArray.length > 0) {
      filesArray[filesArray.length - 1].isActive = true;
    }

    return filesArray;
  }

  const incompleteArtifactMatch = completion.match(
    /<coderocketArtifact[^>]*>[\s\S]*?$/,
  );

  if (!incompleteArtifactMatch) {
    return filesArray;
  }

  const artifactStartIndex = completion.lastIndexOf("<coderocketArtifact");
  if (artifactStartIndex === -1) {
    return [];
  }

  const incompleteArtifactContent = completion.slice(artifactStartIndex);

  const fileRegex =
    /<coderocketFile.*?name=["']([^"']*?)["'].*?(?:action=["']([^"']*?)["'].*?)?>([\s\S]*?)(?=<\/coderocketFile>|<coderocketFile|$)/g;

  let fileMatch;
  while ((fileMatch = fileRegex.exec(incompleteArtifactContent)) !== null) {
    const fileName = fileMatch[1];
    const action = fileMatch[2];
    let content = fileMatch[3].trim();

    content = content
      .replace(/<\/coderocketFile>/g, "")
      .replace(/<\/coderocketArtifact>/g, "")
      .replace(/^\n/, "");

    const isIncomplete =
      content.includes("<!-- FINISH_REASON: length -->") ||
      content.includes("<!-- FINISH_REASON: error -->");

    const lines = content.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    const indentations = nonEmptyLines.map((line) => {
      const match = line.match(/^[ \t]*/);
      return match ? match[0].length : 0;
    });
    const minIndent = indentations.length > 0 ? Math.min(...indentations) : 0;

    content = lines
      .map((line) => line.slice(minIndent))
      .join("\n")
      .trim();

    if (isHtml) {
      content = ensureCDNsPresent(content);
    }

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

export const extractFilesFromArtifact = (
  artifactCode: string,
  previousArtifactCode?: string,
  currentCompletion?: string,
): ChatFile[] => {
  if (!artifactCode) return [];

  const filesArray: ChatFile[] = [];
  let activeFile: string | null = null;

  if (currentCompletion) {
    const fileMatches = Array.from(
      currentCompletion.matchAll(/<coderocketFile[^>]*name=["']([^"']*?)["']/g),
    );
    if (fileMatches.length > 0) {
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

    const closeTagIndex = content.indexOf("</coderocketFile>");
    if (closeTagIndex !== -1) {
      content = content.slice(0, closeTagIndex);
    }

    content = content
      .replace(/<\/coderocketFile>/g, "")
      .replace(/<\/coderocketArtifact>/g, "")
      .replace(/^\n/, "");

    const lines = content.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    const indentations = nonEmptyLines.map((line) => {
      const match = line.match(/^[ \t]*/);
      return match ? match[0].length : 0;
    });
    const minIndent = Math.min(...indentations);

    content = lines
      .map((line) => line.slice(minIndent))
      .join("\n")
      .trim();

    if (!activeFile) {
      activeFile = fileName;
    }

    filesArray.push({
      name: fileName || null,
      content: content,
      isDelete: action === "delete",
      isActive: fileName === activeFile,
      isLocked: locked === "true",
    });
  }

  return filesArray;
};

export function categorizeFiles(files: ChatFile[]): CategorizedFiles {
  const categorized: CategorizedFiles = {
    frontend: [],
    api: [],
    migrations: [],
    types: [],
    config: [],
    env: [],
  };

  files.forEach((file) => {
    if (!file.name) {
      categorized.frontend.push(file);
      return;
    }

    const fileName = file.name.toLowerCase();

    if (fileName.includes("/migrations/") && fileName.endsWith(".sql")) {
      file.category = "migration";
      categorized.migrations.push(file);
    } else if (fileName.includes("/api/") || fileName.includes("/services/")) {
      file.category = "api";
      categorized.api.push(file);
    } else if (
      fileName.includes("/types/") &&
      (fileName.includes("database") || fileName.includes("supabase"))
    ) {
      file.category = "type";
      categorized.types.push(file);
    } else if (
      fileName.includes("/lib/supabase") ||
      fileName.includes("/lib/database")
    ) {
      file.category = "config";
      categorized.config.push(file);
    } else if (
      fileName.endsWith(".env.example") ||
      fileName.endsWith(".env.local.example")
    ) {
      file.category = "env";
      categorized.env.push(file);
    } else {
      file.category = "frontend";
      categorized.frontend.push(file);
    }
  });

  return categorized;
}
