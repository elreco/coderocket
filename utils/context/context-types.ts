export interface FileInfo {
  path: string;
  content: string;
  lines: number;
}

export interface FileMap {
  [path: string]: FileInfo;
}

export interface ContextAnnotation {
  type: "projectSummary" | "codeContext";
  summary?: string;
  files?: string[];
  chatId?: string;
}

export interface ProjectSummaryResult {
  summary: string;
  tokensUsed: {
    input: number;
    output: number;
  };
}

export interface FileSelectionResult {
  selectedFiles: FileMap;
  includedPaths: string[];
  excludedPaths: string[];
  tokensUsed: {
    input: number;
    output: number;
  };
}

export interface ContextOptimizationResult {
  projectSummary?: string;
  contextFiles: FileMap;
  allFilePaths: string[];
  totalTokensUsed: {
    summary: { input: number; output: number };
    selection: { input: number; output: number };
  };
}

export const CONTEXT_CONFIG = {
  MAX_FILES_IN_CONTEXT: 15,
  MIN_FILES_FOR_OPTIMIZATION: 20,
  SUMMARY_MODEL: "claude-3-5-haiku-latest",
  SELECT_MODEL: "claude-3-5-haiku-latest",
  IGNORE_PATTERNS: [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".env",
    ".env.local",
    "*.log",
    "*.map",
  ],
} as const;
