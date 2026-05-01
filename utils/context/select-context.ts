import { generateText } from "ai";

import { Tables } from "@/types_db";
import { anthropicModel } from "@/utils/ai-provider";

import { CONTEXT_CONFIG, FileMap, FileSelectionResult } from "./context-types";
import { extractFilesFromArtifactCode } from "./utils";

const SELECT_SYSTEM_PROMPT = `You are a software engineer. You need to select the most relevant files for the current user request.

You have access to a list of files in the project. Based on the user's request and the project summary, select the files that are most relevant to fulfill the request.

RESPONSE FORMAT:
Your response must be in this exact format:
<updateContextBuffer>
    <includeFile path="path/to/file1"/>
    <includeFile path="path/to/file2"/>
</updateContextBuffer>

RULES:
- Select ONLY files that are directly relevant to the user's request
- Maximum ${CONTEXT_CONFIG.MAX_FILES_IN_CONTEXT} files can be selected
- Always include files that the user explicitly mentions
- Include files that import/export components being modified
- Include configuration files (package.json, tsconfig.json) if dependencies change
- Do NOT include files that won't need changes
- Prioritize: 1) Files being modified, 2) Files importing modified files, 3) Config files
- If the request is unclear, select the main entry point and related components`;

function extractLastUserMessage(messages: Tables<"messages">[]): string {
  const userMessages = messages.filter((m) => m.role === "user");
  const lastUserMessage = userMessages[userMessages.length - 1];
  return lastUserMessage?.content || "";
}

function buildFilesList(files: FileMap): string {
  return Object.keys(files)
    .map((path) => `- ${path}`)
    .join("\n");
}

export async function selectRelevantFiles(props: {
  messages: Tables<"messages">[];
  artifactCode: string;
  projectSummary: string;
  currentContextFiles?: string[];
}): Promise<FileSelectionResult> {
  const {
    messages,
    artifactCode,
    projectSummary,
    currentContextFiles = [],
  } = props;

  const allFiles = extractFilesFromArtifactCode(artifactCode);
  const allFilePaths = Object.keys(allFiles);

  if (allFilePaths.length <= CONTEXT_CONFIG.MAX_FILES_IN_CONTEXT) {
    return {
      selectedFiles: allFiles,
      includedPaths: allFilePaths,
      excludedPaths: [],
      tokensUsed: { input: 0, output: 0 },
    };
  }

  const filesList = buildFilesList(allFiles);
  const lastUserMessage = extractLastUserMessage(messages);
  const currentContextSection =
    currentContextFiles.length > 0
      ? `\nCURRENT CONTEXT BUFFER (files already loaded):\n${currentContextFiles.map((f) => `- ${f}`).join("\n")}`
      : "";

  const prompt = `PROJECT SUMMARY:
${projectSummary}

AVAILABLE FILES:
${filesList}
${currentContextSection}

USER'S REQUEST:
${lastUserMessage}

Select the most relevant files (max ${CONTEXT_CONFIG.MAX_FILES_IN_CONTEXT}) for this request.
Remember: Only include files that will likely need to be read or modified.`;

  const result = await generateText({
    model: anthropicModel(CONTEXT_CONFIG.SELECT_MODEL),
    system: SELECT_SYSTEM_PROMPT,
    prompt,
    maxOutputTokens: 500,
  });

  const response = result.text;
  const updateContextBuffer = response.match(
    /<updateContextBuffer>([\s\S]*?)<\/updateContextBuffer>/,
  );

  const includedPaths: string[] = [];
  const excludedPaths: string[] = [];

  if (updateContextBuffer) {
    const includeMatches = updateContextBuffer[1].match(
      /<includeFile path="([^"]+)"/g,
    );
    if (includeMatches) {
      for (const match of includeMatches) {
        const pathMatch = match.match(/<includeFile path="([^"]+)"/);
        if (pathMatch && pathMatch[1]) {
          const filePath = pathMatch[1];
          if (allFilePaths.includes(filePath)) {
            includedPaths.push(filePath);
          }
        }
      }
    }

    const excludeMatches = updateContextBuffer[1].match(
      /<excludeFile path="([^"]+)"/g,
    );
    if (excludeMatches) {
      for (const match of excludeMatches) {
        const pathMatch = match.match(/<excludeFile path="([^"]+)"/);
        if (pathMatch && pathMatch[1]) {
          excludedPaths.push(pathMatch[1]);
        }
      }
    }
  }

  if (includedPaths.length === 0) {
    const essentialFiles = allFilePaths.filter(
      (path) =>
        path.includes("App.") ||
        path.includes("index.") ||
        path.includes("main.") ||
        path === "package.json",
    );
    includedPaths.push(
      ...essentialFiles.slice(0, CONTEXT_CONFIG.MAX_FILES_IN_CONTEXT),
    );
  }

  const selectedFiles: FileMap = {};
  for (const path of includedPaths) {
    if (allFiles[path]) {
      selectedFiles[path] = allFiles[path];
    }
  }

  return {
    selectedFiles,
    includedPaths,
    excludedPaths,
    tokensUsed: {
      input: result.usage?.inputTokens || 0,
      output: result.usage?.outputTokens || 0,
    },
  };
}
