import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";

export const anthropicModel = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

