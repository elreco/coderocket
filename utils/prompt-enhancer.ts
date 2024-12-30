import { generateText } from "ai";

import { anthropicModel } from "./config";
import { stripIndents } from "./strip-indents";
import { createClient } from "./supabase/server";

export const promptEnhancer = async (prompt: string): Promise<string> => {
  const supabase = await createClient();
  const { data: blobContent, error } = await supabase.storage
    .from("featured")
    .download("system-html.txt");
  if (error) throw new Error("Could not get AI Model file. Please try again");
  const contentMd = await blobContent.text();
  const { text } = await generateText({
    messages: [
      {
        role: "user",
        content: stripIndents`
        I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.
        I want you to keep the main idea of the prompt, don't change it too much. I just want the prompt to be in line with the system prompt without altering the main idea of the prompt.
        If you don't have any modifications to make, just return the original prompt.

        IMPORTANT: Only respond with the improved prompt and nothing else!

        <original_prompt>
          ${prompt}
        </original_prompt>
      `,
      },
    ],
    model: anthropicModel("claude-3-5-sonnet-latest"),
    system: contentMd,
    toolChoice: "none",
    maxTokens: 8192,
  });

  return text;
};
