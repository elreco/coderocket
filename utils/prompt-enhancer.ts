"use server";

import { generateText } from "ai";

import { anthropicModel } from "./config";
import { Framework } from "./config";
import { stripIndents } from "./strip-indents";
import { systemPrompt } from "./system-prompts";
import { htmlSystemPrompt } from "./system-prompts/html";

interface ConversationContext {
  role: "user" | "assistant";
  content: string;
}

export const promptEnhancer = async (
  prompt: string,
  framework: Framework,
  conversationContext?: ConversationContext[],
): Promise<string> => {
  if (prompt.startsWith("Clone this website:")) {
    return prompt;
  }

  const contentMd =
    framework === Framework.HTML ? htmlSystemPrompt() : systemPrompt(framework);

  let contextSection = "";
  if (conversationContext && conversationContext.length > 0) {
    const contextMessages = conversationContext
      .slice(-4)
      .map((msg) => {
        const role = msg.role === "user" ? "User" : "Assistant";
        const content = msg.content.length > 500
          ? msg.content.substring(0, 500) + "..."
          : msg.content;
        return `${role}: ${content}`;
      })
      .join("\n\n");

    contextSection = stripIndents`
      <conversation_context>
      Here are the last exchanges from the conversation to understand the context:

      ${contextMessages}
      </conversation_context>

    `;
  }

  const { text } = await generateText({
    messages: [
      {
        role: "user",
        content: stripIndents`
        I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.
        ${conversationContext && conversationContext.length > 0 ? "Take into account the conversation context to understand what the user is trying to iterate on or modify." : ""}
        Keep the main idea of the prompt, don't change it too much. Make it clearer and more aligned with the system prompt without altering the main intention.
        If you don't have any modifications to make, just return the original prompt.
        Don't mention the technology in the prompt, just the main idea.

        IMPORTANT: Only respond with the improved prompt and nothing else!

        ${contextSection}
        <original_prompt>
          ${prompt}
        </original_prompt>
      `,
      },
    ],
    model: anthropicModel("claude-haiku-4-5"),
    system: contentMd,
    toolChoice: "none",
    maxOutputTokens: 800,
  });

  return text;
};
