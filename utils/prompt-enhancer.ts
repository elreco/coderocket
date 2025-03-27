"use server";

import { generateText } from "ai";

import { anthropicModel } from "./config";
import { Framework } from "./config";
import { stripIndents } from "./strip-indents";
import { systemPrompt } from "./system-prompts";
import { htmlSystemPrompt } from "./system-prompts/html";

export const promptEnhancer = async (
  prompt: string,
  framework: Framework,
): Promise<string> => {
  // If it's a website clone request, return it as is without enhancement
  if (prompt.startsWith("Clone this website:")) {
    return prompt;
  }

  const contentMd =
    framework === Framework.HTML ? htmlSystemPrompt() : systemPrompt(framework);
  const { text } = await generateText({
    messages: [
      {
        role: "user",
        content: stripIndents`
        I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.
        I want you to keep the main idea of the prompt, don't change it too much. I just want the prompt to be in line with the system prompt without altering the main idea of the prompt.
        If you don't have any modifications to make, just return the original prompt.
        Don't mention the technology in the prompt, just the main idea.

        IMPORTANT: Only respond with the improved prompt and nothing else!

        <original_prompt>
          ${prompt}
        </original_prompt>
      `,
      },
    ],
    model: anthropicModel("claude-3-5-haiku-latest"),
    system: contentMd,
    toolChoice: "none",
    maxTokens: 800,
  });

  return text;
};
