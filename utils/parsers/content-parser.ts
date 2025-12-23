import { Tables } from "@/types_db";

import { defaultTheme } from "../config";
import { ContentChunk } from "./types";
import { extractDirectFiles } from "./file-parser";

export const extractContent = (completion: string) => {
  const withoutPartialArtifact = completion.replace(/<coderocket[^>]*$/g, "");

  let artifactCounter = 0;
  const artifacts: string[] = [];

  const textWithPlaceholders = withoutPartialArtifact.replace(
    /<coderocketArtifact>[\s\S]*?<\/coderocketArtifact>/g,
    (match) => {
      artifacts.push(match);
      return `__ARTIFACT_${artifactCounter++}__`;
    },
  );

  const cleanedText = textWithPlaceholders
    .replace(/<[^>]*>/g, "")
    .replace(/<[^>]*$/, "")
    .replace(/&[^;]+;/g, "")
    .replace(/\r\n/g, "\n");

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
  if (
    completion.includes("<coderocketFile") &&
    !completion.includes("<coderocketArtifact")
  ) {
    const directFiles = extractDirectFiles(completion);
    if (directFiles.length > 0) {
      return true;
    }
  }

  const hasCompleteArtifactTags =
    completion.includes("<coderocketArtifact") &&
    completion.includes("</coderocketArtifact>");
  const hasPartialArtifactTags =
    completion.includes("<coderocketArtifact") &&
    !completion.includes("</coderocketArtifact>");
  const hasIncompleteMarker =
    completion.includes("<!-- FINISH_REASON: length -->") ||
    completion.includes("<!-- FINISH_REASON: error -->");

  if (hasPartialArtifactTags && hasIncompleteMarker) {
    return true;
  }

  if (!hasCompleteArtifactTags && !hasPartialArtifactTags) {
    return false;
  }

  if (
    hasPartialArtifactTags &&
    !hasCompleteArtifactTags &&
    !hasIncompleteMarker
  ) {
    return false;
  }

  const artifactRegex = /<coderocketArtifact[\s\S]*?<\/coderocketArtifact>/g;

  const artifactMatches = [];
  let match;
  while ((match = artifactRegex.exec(completion)) !== null) {
    artifactMatches.push(match[0]);
  }

  if (artifactMatches.length === 0) {
    return false;
  }

  for (const artifactContent of artifactMatches) {
    const containsIncompleteFile =
      artifactContent.includes("<!-- FINISH_REASON: length -->") ||
      artifactContent.includes("<!-- FINISH_REASON: error -->");

    if (!containsIncompleteFile) {
      return true;
    }
  }

  return false;
};

export const hasFiles = (completion: string): boolean => {
  return /<coderocketFile/i.test(completion);
};

export const cleanThinkingTags = (content: string): string => {
  if (!content) return content;

  let cleaned = content;

  cleaned = cleaned
    .replace(/<thinking[^>]*>[\s\S]*?<\/thinking>/g, "")
    .replace(/<thinking[^>]*>[\s\S]*$/g, "")
    .replace(/<thinking[^>]*>/g, "")
    .replace(/<\/thinking>/g, "");

  const incompletePatterns = [
    /<thinkin[\s\S]*$/g,
    /<thinki[\s\S]*$/g,
    /<think[\s\S]*$/g,
    /<thin[\s\S]*$/g,
    /<thi[\s\S]*$/g,
  ];

  for (const pattern of incompletePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const matchIndex = cleaned.lastIndexOf(match[0]);
      if (matchIndex !== -1) {
        cleaned = cleaned.substring(0, matchIndex);
      }
    }
  }

  return cleaned;
};

export function splitCompletedContentIntoChunks(
  content: string,
): ContentChunk[] {
  if (!content || !content.trim()) {
    return [];
  }

  const chunks: ContentChunk[] = [];
  const combinedRegex =
    /(<thinking>[\s\S]*?<\/thinking>|<coderocketArtifact[\s\S]*?<\/coderocketArtifact>)/g;
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index).trim();
    if (textBefore) {
      chunks.push({
        type: "text",
        content: textBefore,
      });
    }

    if (match[0].startsWith("<thinking>")) {
      const thinkingContent = match[0].replace(/<\/?thinking>/g, "").trim();
      chunks.push({
        type: "thinking",
        content: thinkingContent,
      });
    } else {
      chunks.push({
        type: "artifact",
        content: match[0],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  const textAfter = content.slice(lastIndex).trim();
  if (textAfter) {
    chunks.push({
      type: "text",
      content: textAfter,
    });
  }

  if (chunks.length > 0) {
    return chunks;
  }

  if (content.includes("<coderocketFile")) {
    const filesRegex = /<coderocketFile[\s\S]*?<\/coderocketFile>/g;
    let filesMatch;
    const files = [];

    while ((filesMatch = filesRegex.exec(content)) !== null) {
      files.push(filesMatch[0]);
    }

    if (files.length > 0) {
      return [
        {
          type: "artifact",
          content: `<coderocketArtifact title="Generated Files">${files.join("\n")}</coderocketArtifact>`,
        },
      ];
    }

    if (content.includes("<coderocketFile")) {
      return [
        {
          type: "artifact",
          content: `<coderocketArtifact title="Generated Files">${content}</coderocketArtifact>`,
        },
      ];
    }
  }

  return [
    {
      type: "text",
      content: content.trim(),
    },
  ];
}

export const splitContentIntoChunks = (completion: string): ContentChunk[] => {
  if (!completion) return [];

  const hasCoderocketFile = completion.includes("<coderocketFile");

  if (hasCoderocketFile && !completion.includes("<coderocketArtifact")) {
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

  const combinedPattern =
    /(<thinking>[\s\S]*?<\/thinking>|<thinking>[\s\S]*?$|<coderocketArtifact[^>]*>[\s\S]*?<\/coderocketArtifact>|<coderocketArtifact[^>]*>[\s\S]*?$|<coderocketFile[^>]*>[\s\S]*?<\/coderocketFile>|<coderocketFile[^>]*>[\s\S]*?$)/g;

  const segments = completion.split(combinedPattern);

  const matches: string[] = [];
  let matchResult;
  while ((matchResult = combinedPattern.exec(completion)) !== null) {
    matches.push(matchResult[0]);
  }

  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 0) {
      if (segments[i].trim()) {
        const cleanedText = segments[i].trim();

        if (cleanedText) {
          chunks.push({
            type: "text",
            content: cleanedText,
          });
        }
      }
    } else {
      const matchIndex = Math.floor(i / 2);
      if (matchIndex < matches.length) {
        const match = matches[matchIndex];

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
    return completion.replace(
      /<html([^>]*)>/,
      `<html$1 data-theme="${theme}">`,
    );
  }
  return completion.replace(
    /data-theme=["'][^"']*["']/,
    `data-theme="${theme}"`,
  );
};

export const extractContentBeforeFinishReason = (
  content: string,
  contextLength: number = 200,
): string => {
  if (!content) return "Continue exactly where you left off";

  const hasLengthMarker = content.includes("<!-- FINISH_REASON: length -->");
  const hasErrorMarker = content.includes("<!-- FINISH_REASON: error -->");

  if (!hasLengthMarker && !hasErrorMarker) {
    return "Continue exactly where you left off";
  }

  const markerIndex = Math.max(
    content.lastIndexOf("<!-- FINISH_REASON: length -->"),
    content.lastIndexOf("<!-- FINISH_REASON: error -->"),
  );

  if (markerIndex <= 0) {
    return "Continue exactly where you left off";
  }

  const contentBeforeMarker = content.substring(0, markerIndex).trim();

  const lastChars = contentBeforeMarker.substring(
    Math.max(0, contentBeforeMarker.length - contextLength),
  );

  let snippetStart = 0;
  const lastLineBreakIndex = lastChars.lastIndexOf("\n");

  if (lastLineBreakIndex !== -1) {
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
  const assistantMessages = messages.filter((msg) => msg.role === "assistant");
  const sortedAssistantMessages = assistantMessages.sort(
    (a, b) => a.version - b.version,
  );
  const lastAssistantMessage =
    sortedAssistantMessages.length > 0
      ? sortedAssistantMessages[sortedAssistantMessages.length - 1]
      : null;

  if (!lastAssistantMessage || !lastAssistantMessage.content) {
    return "Continue exactly where you left off";
  }

  return extractContentBeforeFinishReason(
    lastAssistantMessage.content,
    contextLength,
  );
};
