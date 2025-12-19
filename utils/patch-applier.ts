export type PatchOperationType =
  | "REPLACE_RANGE"
  | "INSERT_AFTER"
  | "DELETE_RANGE";

export interface PatchOperation {
  type: PatchOperationType;
  startLine: number;
  endLine?: number;
  contentLines?: string[];
}

export interface ParsedPatch {
  version: string;
  operations: PatchOperation[];
}

export const PATCH_HEADER = "PATCH_V1";

export function isUnifiedDiffFormat(content: string): boolean {
  if (!content) {
    return false;
  }
  const lines = content.split("\n");
  let plusCount = 0;
  let minusCount = 0;
  let totalLines = 0;

  for (const line of lines) {
    if (line.trim() === "") continue;
    totalLines++;
    if (line.startsWith("+") && !line.startsWith("+++")) {
      plusCount++;
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      minusCount++;
    }
  }

  if (totalLines < 3) return false;
  const diffRatio = (plusCount + minusCount) / totalLines;
  return diffRatio > 0.3 && plusCount > 0 && minusCount > 0;
}

export function cleanUnifiedDiffContent(content: string): string {
  if (!content) return content;

  const lines = content.split("\n");
  const cleanedLines: string[] = [];
  let inDiffBlock = false;
  let diffLinesCount = 0;
  let normalLinesCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      trimmed.startsWith("---") ||
      trimmed.startsWith("+++") ||
      trimmed.startsWith("@@")
    ) {
      inDiffBlock = true;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("--")) {
      diffLinesCount++;
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("++")) {
      diffLinesCount++;
      cleanedLines.push(line.substring(1));
      continue;
    }

    if (line.startsWith(" ") && inDiffBlock) {
      cleanedLines.push(line.substring(1));
      continue;
    }

    normalLinesCount++;
    cleanedLines.push(line);
  }

  if (diffLinesCount > 0 && diffLinesCount > normalLinesCount * 0.1) {
    return cleanedLines.join("\n");
  }

  return content;
}

export function detectAndCleanMalformedDiff(content: string): string {
  if (!content) return content;

  const lines = content.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("+") && !line.startsWith("++")) {
      const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

      if (nextLine && nextLine.startsWith("-")) {
        result.push(line.substring(1));
        i += 2;
        continue;
      }

      result.push(line.substring(1));
      i++;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("--")) {
      i++;
      continue;
    }

    result.push(line);
    i++;
  }

  return result.join("\n");
}

export function isPatchFormat(content: string): boolean {
  if (!content) {
    return false;
  }
  const lines = content.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    return line === PATCH_HEADER;
  }
  return false;
}

export function parsePatch(content: string): ParsedPatch | null {
  if (!isPatchFormat(content)) {
    return null;
  }
  const lines = content.split("\n");
  let index = 0;
  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }
  if (index >= lines.length || lines[index].trim() !== PATCH_HEADER) {
    return null;
  }
  index += 1;
  const operations: PatchOperation[] = [];
  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (line.startsWith("REPLACE_RANGE")) {
      const parts = line.split(/\s+/);
      if (parts.length < 3) {
        index += 1;
        continue;
      }
      const startLine = parseInt(parts[1], 10);
      const endLine = parseInt(parts[2], 10);
      if (!Number.isFinite(startLine) || !Number.isFinite(endLine)) {
        index += 1;
        continue;
      }
      const bodyLines: string[] = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "END_REPLACE") {
        bodyLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length && lines[index].trim() === "END_REPLACE") {
        index += 1;
      }
      operations.push({
        type: "REPLACE_RANGE",
        startLine,
        endLine,
        contentLines: bodyLines,
      });
      continue;
    }
    if (line.startsWith("INSERT_AFTER")) {
      const parts = line.split(/\s+/);
      if (parts.length < 2) {
        index += 1;
        continue;
      }
      const startLine = parseInt(parts[1], 10);
      if (!Number.isFinite(startLine)) {
        index += 1;
        continue;
      }
      const bodyLines: string[] = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "END_INSERT") {
        bodyLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length && lines[index].trim() === "END_INSERT") {
        index += 1;
      }
      operations.push({
        type: "INSERT_AFTER",
        startLine,
        contentLines: bodyLines,
      });
      continue;
    }
    if (line.startsWith("DELETE_RANGE")) {
      const parts = line.split(/\s+/);
      if (parts.length < 3) {
        index += 1;
        continue;
      }
      const startLine = parseInt(parts[1], 10);
      const endLine = parseInt(parts[2], 10);
      if (!Number.isFinite(startLine) || !Number.isFinite(endLine)) {
        index += 1;
        continue;
      }
      operations.push({
        type: "DELETE_RANGE",
        startLine,
        endLine,
      });
      index += 1;
      continue;
    }
    index += 1;
  }
  return {
    version: PATCH_HEADER,
    operations,
  };
}

export function applyPatchToContent(
  originalContent: string,
  patchContent: string,
): string {
  const parsed = parsePatch(patchContent);
  if (!parsed) {
    return originalContent;
  }
  const originalLines = originalContent.split("\n");
  let lines = originalLines.slice();

  if (parsed.operations.length === 0) {
    console.warn("[Patch] No valid operations found in patch");
    return originalContent;
  }

  const ops = parsed.operations.slice().sort((a, b) => {
    const aLine = a.startLine;
    const bLine = b.startLine;
    if (aLine === bLine) {
      if (a.type === b.type) {
        return 0;
      }
      if (a.type === "INSERT_AFTER") {
        return 1;
      }
      if (b.type === "INSERT_AFTER") {
        return -1;
      }
      return 0;
    }
    return aLine - bLine;
  });

  for (let i = ops.length - 1; i >= 0; i -= 1) {
    const operation = ops[i];

    if (operation.startLine < 1) {
      console.warn(
        `[Patch] Invalid startLine ${operation.startLine}, skipping operation`,
      );
      continue;
    }

    if (operation.type === "REPLACE_RANGE") {
      const startIndex = Math.max(0, operation.startLine - 1);
      const endIndex = Math.max(
        0,
        (operation.endLine ?? operation.startLine) - 1,
      );

      if (startIndex >= lines.length) {
        console.warn(
          `[Patch] REPLACE_RANGE startLine ${operation.startLine} exceeds file length ${lines.length}, appending instead`,
        );
        const replacement = operation.contentLines ?? [];
        lines = [...lines, ...replacement];
        continue;
      }

      if (endIndex < startIndex) {
        console.warn(
          `[Patch] REPLACE_RANGE endLine ${operation.endLine} is less than startLine ${operation.startLine}, skipping`,
        );
        continue;
      }

      const clampedStart = Math.min(startIndex, lines.length);
      const clampedEnd = Math.min(endIndex, lines.length - 1);
      const replacement = operation.contentLines ?? [];

      const rangeSize = clampedEnd - clampedStart + 1;
      const replacementSize = replacement.length;
      if (
        rangeSize > 0 &&
        replacementSize > 0 &&
        Math.abs(rangeSize - replacementSize) > rangeSize * 2
      ) {
        console.warn(
          `[Patch] Large size difference in REPLACE_RANGE: replacing ${rangeSize} lines with ${replacementSize} lines`,
        );
      }

      lines = [
        ...lines.slice(0, clampedStart),
        ...replacement,
        ...lines.slice(clampedEnd + 1),
      ];
      continue;
    }
    if (operation.type === "INSERT_AFTER") {
      const insertIndex = Math.max(0, operation.startLine);
      const clampedIndex = Math.min(insertIndex, lines.length);
      const insertion = operation.contentLines ?? [];
      lines = [
        ...lines.slice(0, clampedIndex),
        ...insertion,
        ...lines.slice(clampedIndex),
      ];
      continue;
    }
    if (operation.type === "DELETE_RANGE") {
      const startIndex = Math.max(0, operation.startLine - 1);
      const endIndex = Math.max(
        0,
        (operation.endLine ?? operation.startLine) - 1,
      );

      if (startIndex >= lines.length) {
        console.warn(
          `[Patch] DELETE_RANGE startLine ${operation.startLine} exceeds file length ${lines.length}, skipping`,
        );
        continue;
      }

      if (endIndex < startIndex) {
        console.warn(
          `[Patch] DELETE_RANGE endLine ${operation.endLine} is less than startLine ${operation.startLine}, skipping`,
        );
        continue;
      }

      const clampedStart = Math.min(startIndex, lines.length);
      const clampedEnd = Math.min(endIndex, lines.length - 1);
      lines = [...lines.slice(0, clampedStart), ...lines.slice(clampedEnd + 1)];
      continue;
    }
  }
  return lines.join("\n");
}
