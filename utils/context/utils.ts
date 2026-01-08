import { CONTEXT_CONFIG, FileMap } from "./context-types";

export function extractFilesFromArtifactCode(artifactCode: string): FileMap {
  const files: FileMap = {};

  const fileRegex =
    /<coderocketFile[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/coderocketFile>/g;

  let match;
  while ((match = fileRegex.exec(artifactCode)) !== null) {
    const filePath = match[1];
    const content = match[2].trim();

    if (shouldIgnoreFile(filePath)) {
      continue;
    }

    const lines = content.split("\n").length;

    files[filePath] = {
      path: filePath,
      content,
      lines,
    };
  }

  return files;
}

export function shouldIgnoreFile(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();

  for (const pattern of CONTEXT_CONFIG.IGNORE_PATTERNS) {
    if (pattern.startsWith("*")) {
      const ext = pattern.substring(1);
      if (lowerPath.endsWith(ext)) {
        return true;
      }
    } else if (lowerPath.includes(pattern.toLowerCase())) {
      return true;
    }
  }

  return false;
}

export function extractFilePaths(artifactCode: string): string[] {
  const fileRegex = /<coderocketFile[^>]*name=["']([^"']+)["'][^>]*>/g;
  const paths: string[] = [];

  let match;
  while ((match = fileRegex.exec(artifactCode)) !== null) {
    const filePath = match[1];
    if (!shouldIgnoreFile(filePath)) {
      paths.push(filePath);
    }
  }

  return paths;
}

export function createFilesContext(
  files: FileMap,
  includeLineNumbers = false,
): string {
  const fileEntries = Object.entries(files);

  const fileContexts = fileEntries.map(([path, fileInfo]) => {
    let content = fileInfo.content;

    if (includeLineNumbers) {
      content = content
        .split("\n")
        .map((line, i) => `${i + 1}|${line}`)
        .join("\n");
    }

    return `<coderocketFile name="${path}">\n${content}\n</coderocketFile>`;
  });

  return fileContexts.join("\n\n");
}

export function getFileContent(
  artifactCode: string,
  filePath: string,
): string | null {
  const escapedPath = filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<coderocketFile[^>]*name=["']${escapedPath}["'][^>]*>([\\s\\S]*?)<\\/coderocketFile>`,
  );

  const match = artifactCode.match(regex);
  return match ? match[1].trim() : null;
}

export function countTotalLines(files: FileMap): number {
  return Object.values(files).reduce((total, file) => total + file.lines, 0);
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function shouldUseContextOptimization(artifactCode: string): boolean {
  const filePaths = extractFilePaths(artifactCode);
  return filePaths.length >= CONTEXT_CONFIG.MIN_FILES_FOR_OPTIMIZATION;
}

export function buildProjectManifest(files: FileMap): string {
  const fileCount = Object.keys(files).length;
  const totalLines = countTotalLines(files);

  let manifest = `<project_manifest>\n`;
  manifest += `  <summary>Project with ${fileCount} files (${totalLines} total lines)</summary>\n`;
  manifest += `  <files count="${fileCount}">\n`;

  for (const [path, fileInfo] of Object.entries(files)) {
    const fileType = getFileType(path);
    manifest += `    <file path="${path}" lines="${fileInfo.lines}" type="${fileType}" />\n`;
  }

  manifest += `  </files>\n`;
  manifest += `</project_manifest>`;

  return manifest;
}

function getFileType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";

  const typeMap: Record<string, string> = {
    tsx: "react-component",
    jsx: "react-component",
    ts: "typescript",
    js: "javascript",
    vue: "vue-component",
    svelte: "svelte-component",
    css: "stylesheet",
    scss: "stylesheet",
    json: "config",
    html: "markup",
    md: "documentation",
  };

  return typeMap[ext] || "file";
}
