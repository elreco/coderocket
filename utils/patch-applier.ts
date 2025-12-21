export const PATCH_HEADER = "PATCH_V1";

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

export function isUnifiedDiffFormat(content: string): boolean {
  if (!content) {
    return false;
  }
  const lines = content.split("\n");
  let plusCount = 0;
  let minusCount = 0;
  let totalLines = 0;
  let hasDiffMarkers = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    totalLines++;

    if (
      trimmed.startsWith("---") ||
      trimmed.startsWith("+++") ||
      trimmed.startsWith("@@")
    ) {
      hasDiffMarkers = true;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      plusCount++;
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      minusCount++;
    }
  }

  if (totalLines < 2) return false;

  if (hasDiffMarkers) {
    return true;
  }

  const diffRatio = (plusCount + minusCount) / totalLines;
  return diffRatio > 0.2 && plusCount > 0 && minusCount > 0;
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
  let hasDiffLines = false;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      trimmed.startsWith("---") ||
      trimmed.startsWith("+++") ||
      trimmed.startsWith("@@")
    ) {
      i++;
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("++")) {
      hasDiffLines = true;
      const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

      if (nextLine && nextLine.startsWith("-") && !nextLine.startsWith("--")) {
        result.push(line.substring(1));
        i += 2;
        continue;
      }

      result.push(line.substring(1));
      i++;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("--")) {
      hasDiffLines = true;
      i++;
      continue;
    }

    if (line.startsWith(" ") && hasDiffLines) {
      result.push(line.substring(1));
      i++;
      continue;
    }

    result.push(line);
    i++;
  }

  return result.join("\n");
}
