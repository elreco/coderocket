import { generateText } from "ai";

import { Tables } from "@/types_db";
import { anthropicModel } from "@/utils/ai-provider";

import { CONTEXT_CONFIG, FileMap, ProjectSummaryResult } from "./context-types";
import { extractFilesFromArtifactCode } from "./utils";

const SUMMARY_SYSTEM_PROMPT = `You are a software engineer analyzing a project. You need to summarize the current state of the project and the conversation history.

RESPONSE FORMAT:
You must respond with a structured summary following this exact format:

# Project Overview
- **Project**: {project_name} - {brief_description}
- **Tech Stack**: {languages}, {frameworks}, {key_dependencies}
- **Files Count**: {number_of_files}

# Current State
- **Main Features**: {list of implemented features}
- **Entry Point**: {main file or component}
- **Key Components**: {important components/modules}

# Recent Changes
- {latest_modification_1}
- {latest_modification_2}

# User Requirements
- **Current Focus**: {what user is working on}
- **Pending Tasks**: {upcoming features or fixes}

# Critical Context
- **Must Preserve**: {crucial code or logic that must not be changed}
- **Known Issues**: {documented problems}

RULES:
- Keep the summary concise (max 500 words)
- Focus on information needed for code generation continuity
- Do not include code snippets, only descriptions
- Use the exact format above`;

function simplifyMessageContent(content: string): string {
  let simplified = content;

  simplified = simplified.replace(
    /<coderocketArtifact[\s\S]*?<\/coderocketArtifact>/g,
    "[Code artifact generated]",
  );
  simplified = simplified.replace(/<thinking>[\s\S]*?<\/thinking>/g, "");
  simplified = simplified.replace(
    /<coderocketFile[\s\S]*?<\/coderocketFile>/g,
    "[File content]",
  );

  if (simplified.length > 500) {
    simplified = simplified.substring(0, 500) + "...";
  }

  return simplified.trim();
}

function buildMessagesContext(messages: Tables<"messages">[]): string {
  const recentMessages = messages.slice(-6);

  return recentMessages
    .map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      const content = simplifyMessageContent(msg.content || "");
      return `[${role}] ${content}`;
    })
    .join("\n\n---\n\n");
}

function buildFilesOverview(files: FileMap): string {
  const filePaths = Object.keys(files);
  const filesList = filePaths
    .map((path) => {
      const file = files[path];
      return `- ${path} (${file.lines} lines)`;
    })
    .join("\n");

  return `Total files: ${filePaths.length}\n${filesList}`;
}

export async function createProjectSummary(props: {
  messages: Tables<"messages">[];
  artifactCode: string;
  previousSummary?: string;
}): Promise<ProjectSummaryResult> {
  const { messages, artifactCode, previousSummary } = props;

  const files = extractFilesFromArtifactCode(artifactCode);
  const filesOverview = buildFilesOverview(files);
  const messagesContext = buildMessagesContext(messages);

  const previousSummarySection = previousSummary
    ? `\n\nPREVIOUS SUMMARY (update this with new information):\n${previousSummary}`
    : "";

  const prompt = `Analyze this project and provide a structured summary.

PROJECT FILES:
${filesOverview}

RECENT CONVERSATION:
${messagesContext}
${previousSummarySection}

Generate a concise summary following the exact format specified.`;

  const result = await generateText({
    model: anthropicModel(CONTEXT_CONFIG.SUMMARY_MODEL),
    system: SUMMARY_SYSTEM_PROMPT,
    prompt,
    maxOutputTokens: 1000,
  });

  return {
    summary: result.text,
    tokensUsed: {
      input: result.usage?.inputTokens || 0,
      output: result.usage?.outputTokens || 0,
    },
  };
}
