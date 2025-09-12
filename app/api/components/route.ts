export const maxDuration = 300;
import {
  CoreMessage,
  LanguageModelUsage,
  streamText,
  ImagePart,
  TextPart,
} from "ai";
import { after } from "next/server";

import { buildComponent } from "@/app/(default)/components/[slug]/actions";
import { autoSyncToGithubAfterGeneration } from "@/app/(default)/components/[slug]/github-sync-actions";
import {
  decrementExtraMessagesCount,
  fetchChatById,
  fetchLastUserMessageByChatId,
  fetchMessagesByChatId,
  fetchUserMessageByChatIdAndVersion,
  getExtraMessagesCount,
} from "@/app/(default)/components/actions";
import { getSubscription } from "@/app/supabase-server";
import { Tables } from "@/types_db";
import { cloneWebsite } from "@/utils/actions/clone-website";
import { takeScreenshot } from "@/utils/capture-screenshot";
import {
  extractDataTheme,
  extractTitle,
  getUpdatedArtifactCode,
} from "@/utils/completion-parser";
import {
  Framework,
  TRIAL_PLAN_MESSAGES_PER_MONTH,
  anthropicModel,
  getMaxMessagesPerPeriod,
  storageUrl,
  MAX_TOKENS_PER_REQUEST,
  PREMIUM_CHAR_LIMIT,
  MAX_VERSIONS_PER_COMPONENT,
} from "@/utils/config";
// import { promptEnhancer } from "@/utils/prompt-enhancer";
import { formatToTimestamp } from "@/utils/date";
import { getPreviousArtifactCode } from "@/utils/supabase/artifact-helpers";
import { createClient } from "@/utils/supabase/server";
import { systemPrompt } from "@/utils/system-prompts";
import { htmlSystemPrompt } from "@/utils/system-prompts/html";

interface ContextResult {
  limitedMessages: Tables<"messages">[];
  contextSummary?: string;
}

const buildIntelligentContext = async (
  messages: Tables<"messages">[],
): Promise<ContextResult> => {
  // Smart context management with dynamic limits based on content complexity
  const baseMaxMessages = 30; // Increased base limit
  const maxCriticalMessages = 8; // More critical messages preserved

  if (messages.length <= baseMaxMessages) {
    return { limitedMessages: messages };
  }

  // Analyze message complexity to determine optimal context size
  const avgContentLength =
    messages.reduce((sum, m) => sum + (m.content?.length || 0), 0) /
    messages.length;
  const complexityFactor = avgContentLength > 500 ? 0.7 : 1.2; // Adjust based on content complexity
  const dynamicMaxMessages = Math.floor(baseMaxMessages * complexityFactor);

  // Always preserve critical messages (early project context)
  const criticalMessages = messages.slice(0, maxCriticalMessages);

  // Preserve key milestone messages (every 5th version after critical)
  const milestoneMessages = messages
    .slice(maxCriticalMessages)
    .filter(
      (m, index) =>
        (index + maxCriticalMessages) % 5 === 0 && m.role === "assistant",
    )
    .slice(-3); // Keep last 3 milestones

  // Get the most recent messages
  const recentMessages = messages.slice(-dynamicMaxMessages);

  // Check for overlaps and create unique message set
  const criticalVersions = new Set(criticalMessages.map((m) => m.version));
  const milestoneVersions = new Set(milestoneMessages.map((m) => m.version));

  const isNotDuplicate = (m: Tables<"messages">) =>
    !criticalVersions.has(m.version) && !milestoneVersions.has(m.version);

  const uniqueRecentMessages = recentMessages.filter(isNotDuplicate);

  // Create enhanced context summary with more detail
  let contextSummary: string | undefined;

  if (messages.length > dynamicMaxMessages + maxCriticalMessages) {
    const skippedMessages = messages.slice(
      maxCriticalMessages,
      -dynamicMaxMessages,
    );
    const userRequests = skippedMessages.filter((m) => m.role === "user");
    const aiResponses = skippedMessages.filter((m) => m.role === "assistant");

    // Extract key themes from skipped user messages
    const themes = userRequests.slice(-5).map((m) => {
      const content = m.content?.toLowerCase() || "";

      const isAddition = content.includes("add") || content.includes("create");
      const isFix = content.includes("fix") || content.includes("bug");
      const isStyling = content.includes("style") || content.includes("design");
      const isImprovement =
        content.includes("improve") || content.includes("enhance");

      if (isAddition) return "feature additions";
      if (isFix) return "bug fixes";
      if (isStyling) return "styling updates";
      if (isImprovement) return "improvements";
      return "modifications";
    });

    const uniqueThemes = Array.from(new Set(themes));

    contextSummary = `[Context Bridge: ${userRequests.length} user requests and ${aiResponses.length} AI responses were processed in the middle of this conversation, focusing on: ${uniqueThemes.join(", ")}. The project has evolved through multiple iterations while maintaining its core structure. Key architectural decisions and component patterns from earlier iterations remain relevant.]`;
  }

  // Combine all messages and maintain chronological order
  const combinedMessages = [
    ...criticalMessages,
    ...milestoneMessages,
    ...uniqueRecentMessages,
  ].sort((a, b) => a.version - b.version);

  // Save context summary to database for persistence
  if (contextSummary && messages.length > 0) {
    await saveContextToDatabase(
      messages[0].chat_id,
      contextSummary,
      messages.length,
    );
  }

  return {
    limitedMessages: combinedMessages,
    contextSummary,
  };
};

const saveContextToDatabase = async (
  chatId: string,
  contextSummary: string,
  totalMessages: number,
) => {
  try {
    const supabase = await createClient();

    // Get existing metadata
    const { data: existingChat } = await supabase
      .from("chats")
      .select("metadata")
      .eq("id", chatId)
      .single();

    // Safely handle metadata using Object.assign to avoid TypeScript spread issues
    const existingMetadata = existingChat?.metadata || {};
    const newContextHistory = {
      lastSaved: new Date().toISOString(),
      totalMessages,
      contextSummary,
    };

    // Update metadata with context information
    const updatedMetadata = Object.assign({}, existingMetadata, {
      contextHistory: newContextHistory,
    });

    await supabase
      .from("chats")
      .update({ metadata: updatedMetadata })
      .eq("id", chatId);
  } catch (error) {
    console.error("Failed to save context to database:", error);
    // Non-critical error, continue execution
  }
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const id = formData.get("id") as string;
    const selectedVersion =
      Number(formData.get("selectedVersion")) || undefined;
    const image = formData.get("image") as File | null;
    const prompt = formData.get("prompt") as string | null;
    const aiPrompt = formData.get("aiPrompt") as string | null;

    // Valider la requête et récupérer les messages, le framework, et le prompt mis à jour
    // Si un site est cloné, cette fonction va aussi capturer et enregistrer un screenshot
    // qui sera ensuite envoyé à Anthropic avec le prompt
    const { messagesFromDatabase, framework, updatedPrompt, updatedImage } =
      await validateRequest(id, image, prompt, aiPrompt, selectedVersion);

    const { messagesToOpenAI: messages } = await buildMessagesToOpenAi(
      messagesFromDatabase,
      updatedPrompt,
      updatedImage, // Le chemin vers le screenshot capturé si disponible
      selectedVersion,
    );

    // Add detailed logging for debugging
    // Add detailed logging for debugging cloning issues
    console.log("=== AI Generation Debug Info ===");
    console.log("Chat ID:", id);
    console.log("Framework:", framework);
    console.log("Messages count:", messages.length);
    console.log("Prompt length:", updatedPrompt.length);
    console.log("Has image:", !!updatedImage);
    console.log(
      "Is clone request:",
      updatedPrompt.includes("Clone this website:"),
    );

    if (updatedPrompt.includes("Clone this website:")) {
      console.log(
        "Clone URL:",
        updatedPrompt.split("Clone this website: ")[1]?.split("\n")[0],
      );
      console.log(
        "First 200 chars of clone prompt:",
        updatedPrompt.substring(0, 200),
      );
    }

    // Log the actual prompt being sent to AI (truncated for readability)
    console.log(
      "Final prompt preview:",
      updatedPrompt.substring(0, 500) + "...",
    );

    console.log("=== Starting AI Stream ===");
    const stream = streamText({
      messages: [
        {
          role: "system",
          content:
            framework === Framework.HTML
              ? htmlSystemPrompt(
                  messagesFromDatabase.length === 1
                    ? messagesFromDatabase[0]?.theme
                    : null,
                )
              : systemPrompt(framework as Framework),
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        ...messages,
      ],
      model: anthropicModel("claude-4-sonnet-20250514"),
      toolChoice: "none",
      maxTokens: MAX_TOKENS_PER_REQUEST,
      onFinish: async ({ text, usage, finishReason, providerMetadata }) => {
        console.log("=== AI Generation Finished ===");
        console.log("Generated text length:", text?.length || 0);
        console.log("Finish reason:", finishReason);
        console.log("Usage:", usage);

        // Check if generation actually produced content
        if (!text || text.trim().length === 0) {
          console.error("❌ AI generation failed - no content produced");
          console.error("Finish reason was:", finishReason);
          console.error("Usage tokens:", usage);
          finishReason = "error";
          text =
            "AI generation failed to produce content. This may be due to prompt complexity or API issues. Please try again with a simpler prompt.";
        } else {
          console.log(
            "✅ AI generation successful, content length:",
            text.length,
          );
        }

        await updateDataAfterCompletion(
          id,
          text,
          updatedPrompt,
          usage,
          updatedImage,
          finishReason,
          providerMetadata,
        );
      },
      onError: (error) => {
        console.error("=== AI Generation Error ===");
        console.error("Error details:", error);
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
      },
    });

    return stream.toTextStreamResponse();
  } catch (error: unknown) {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

const buildMessagesToOpenAi = async (
  messages: Tables<"messages">[],
  updatedPrompt: string, // Ce paramètre contient le prompt détaillé avec tous les détails du site
  updatedImage: string | null,
  selectedVersion?: number,
) => {
  // Filter messages based on selectedVersion if provided
  const filteredMessages =
    selectedVersion !== undefined
      ? messages.filter((m) => m.version <= selectedVersion)
      : messages;

  // Intelligent context management instead of hard limit
  const { limitedMessages, contextSummary } =
    await buildIntelligentContext(filteredMessages);

  // Map messages to OpenAI format
  const messagesToOpenAI = limitedMessages.map((m, index) => {
    // Add context summary after the first few critical messages if available
    const hasSummary = Boolean(contextSummary);
    const isOptimalPosition = index === Math.min(5, limitedMessages.length - 1);
    const isUserMessage = m.role === "user";
    const shouldAddSummary = hasSummary && isOptimalPosition && isUserMessage;

    if (m.role === "user" && m.prompt_image) {
      const isNewProject = limitedMessages.length === 1;
      const baseContent = m.content || "";

      let textContent = baseContent;
      if (isNewProject) {
        textContent = `NEW PROJECT CodeRocket - ${baseContent}`;
      } else if (shouldAddSummary) {
        textContent = `${contextSummary}\n\n${baseContent}`;
      }

      return {
        role: m.role as "user" | "assistant" | "tool" | "system",
        content: [
          {
            type: "text",
            text: textContent,
          },
          {
            type: "image",
            image: new URL(`${storageUrl}/${m.prompt_image}`),
          },
        ],
      };
    }

    const isNewProject = limitedMessages.length === 1 && m.role === "user";
    const baseContent = m.content || "";

    let textContent = baseContent;
    if (isNewProject) {
      textContent = `NEW PROJECT CodeRocket - ${baseContent}`;
    } else if (shouldAddSummary) {
      textContent = `${contextSummary}\n\n${baseContent}`;
    }

    return {
      role: m.role as "user" | "assistant" | "tool" | "system",
      content: textContent,
    };
  }) as CoreMessage[];

  // Préparer le contenu du message final de l'utilisateur
  const finalMessageContent: Array<TextPart | ImagePart> = [];

  // Toujours inclure le texte du prompt
  finalMessageContent.push({
    type: "text",
    text: updatedPrompt,
  });

  // Si une image a été uploadée ou une capture d'écran est disponible
  if (updatedImage) {
    finalMessageContent.push({
      type: "image",
      image: new URL(`${storageUrl}/${updatedImage}`),
    });
  }

  // Ajouter le dernier message de l'utilisateur avec le prompt détaillé et les images
  messagesToOpenAI.push({
    role: "user",
    content:
      finalMessageContent.length > 1 ? finalMessageContent : updatedPrompt,
  });

  return { messagesToOpenAI };
};

const validateRequest = async (
  id: string,
  image: File | null,
  prompt: string | null,
  aiPrompt: string | null,
  selectedVersion?: number,
) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Could not get user");

  // Utiliser aiPrompt s'il est disponible, sinon utiliser prompt
  const finalPrompt = aiPrompt || prompt;

  // Validation de la longueur du prompt
  if (finalPrompt) {
    if (finalPrompt.length > PREMIUM_CHAR_LIMIT) {
      throw new Error(
        `Votre prompt dépasse la limite de ${PREMIUM_CHAR_LIMIT} caractères (environ ${MAX_TOKENS_PER_REQUEST} tokens). Veuillez le raccourcir pour continuer.`,
      );
    }
  }

  // Fetch chat data
  const chat = await fetchChatById(id);
  if (!chat) throw new Error("Could not get chat data");

  // Validate user
  if (chat.user?.id !== user.id) {
    throw new Error("User is not authorized to modify chat");
  }

  // Vérifier si c'est un site cloné et récupérer les détails si nécessaire
  let enhancedPrompt = finalPrompt;
  let updatedImage = null;

  if (chat.clone_url && prompt?.includes("Clone this website:") && !aiPrompt) {
    try {
      const cloneResult = await cloneWebsite(chat.clone_url);

      if (cloneResult.success && cloneResult.data) {
        // Build a more concise, token-efficient prompt
        const data = cloneResult.data;

        // Limit and filter data to prevent token overflow
        const essentialColors = data.structure.colors?.slice(0, 8) || [];
        const essentialFonts = data.structure.fonts?.slice(0, 3) || [];
        const essentialSections = data.structure.sections?.slice(0, 3) || [];
        const essentialMenu = data.structure.menu?.slice(0, 5) || [];
        const essentialImages = data.heroImages?.slice(0, 3) || [];

        // Create simplified, token-efficient prompt for cloning
        enhancedPrompt = `Clone this website: ${chat.clone_url}

## LAYOUT & DESIGN
${data.structure.layoutDescription || "Standard website layout"}

Colors: ${essentialColors.join(", ")}
Fonts: ${essentialFonts.join(", ")}

## SECTIONS
${essentialSections.map((s) => `- ${s.type}: ${s.content || s.title || ""}`).join("\n")}

## NAVIGATION  
${essentialMenu.map((m) => `- ${m.text} (${m.url || "#"})`).join("\n")}

## IMAGES
${essentialImages.map((img) => `- ${img.url} (${img.alt || "Image"})`).join("\n")}

Focus on recreating the visual layout and core functionality.`;

        // Handle screenshot upload if available
        if (cloneResult.data.screenshot) {
          try {
            const buffer = Buffer.from(cloneResult.data.screenshot, "base64");
            const screenshotFileName = `${Date.now()}-${user?.id}-screenshot.jpg`;

            const { data: imageData, error: imageError } =
              await supabase.storage
                .from("images")
                .upload(screenshotFileName, buffer, {
                  contentType: "image/jpeg",
                  cacheControl: "3600",
                });

            if (!imageError && imageData?.path) {
              updatedImage = imageData.path;
            }
          } catch (screenshotError) {
            console.error("Error processing screenshot:", screenshotError);
          }
        }
      } else {
        console.error("Failed to clone website:", cloneResult.error);
        enhancedPrompt = finalPrompt; // fallback au prompt original
      }
    } catch (error) {
      console.error("Error during website cloning:", error);
      enhancedPrompt = finalPrompt; // fallback au prompt original
    }
  }

  const messagesFromDatabase = await fetchMessagesByChatId(id);
  if (!messagesFromDatabase) throw new Error("Could not get chat messages");

  // Check subscription
  const subscription = await getSubscription();

  // Vérifier les messages supplémentaires achetés
  const extraMessages = await getExtraMessagesCount(user.id);

  if (subscription) {
    // Calculate the start of the current billing month based on current_period_start
    const currentPeriodStart = new Date(subscription.current_period_start);

    // Vérifier la limite quotidienne
    const { count: originalCount } = await supabase
      .from("messages")
      .select("*, chats!inner(*)", { count: "exact", head: true })
      .eq("chats.user_id", user.id)
      .gte("created_at", formatToTimestamp(currentPeriodStart))
      .is("chats.remix_chat_id", null)
      .neq("is_github_pull", true);

    const { count: remixCount } = await supabase
      .from("messages")
      .select("*, chats!inner(*)", { count: "exact", head: true })
      .eq("chats.user_id", user.id)
      .gte("created_at", formatToTimestamp(currentPeriodStart))
      .not("chats.remix_chat_id", "is", null)
      .gt("version", 0)
      .neq("is_github_pull", true);

    const count = (originalCount || 0) + (remixCount || 0);

    const maxMessagesPerPeriod = getMaxMessagesPerPeriod(subscription);
    if (count >= maxMessagesPerPeriod) {
      // Si l'utilisateur a des messages supplémentaires, utiliser un message supplémentaire
      if (extraMessages > 0) {
        const decremented = await decrementExtraMessagesCount(user.id);
        if (!decremented) {
          throw new Error("limit-exceeded");
        }
      } else {
        throw new Error("limit-exceeded");
      }
    }
  } else {
    // Utiliser le premier jour du mois en cours comme période de départ
    const today = new Date();
    const currentPeriodStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );

    // Vérifier la limite mensuelle pour les utilisateurs gratuits
    const { count: originalCount } = await supabase
      .from("messages")
      .select("*, chats!inner(*)", { count: "exact", head: true })
      .eq("chats.user_id", user.id)
      .gte("created_at", formatToTimestamp(currentPeriodStart))
      .is("chats.remix_chat_id", null)
      .neq("is_github_pull", true);

    const { count: remixCount } = await supabase
      .from("messages")
      .select("*, chats!inner(*)", { count: "exact", head: true })
      .eq("chats.user_id", user.id)
      .gte("created_at", formatToTimestamp(currentPeriodStart))
      .not("chats.remix_chat_id", "is", null)
      .gt("version", 0)
      .neq("is_github_pull", true);

    const count = (originalCount || 0) + (remixCount || 0);

    if (count >= TRIAL_PLAN_MESSAGES_PER_MONTH) {
      // Si l'utilisateur a des messages supplémentaires, utiliser un message supplémentaire
      if (extraMessages > 0) {
        const decremented = await decrementExtraMessagesCount(user.id);
        if (!decremented) {
          throw new Error("limit-exceeded");
        }
      } else {
        throw new Error("limit-exceeded");
      }
    }
  }

  if (
    messagesFromDatabase.filter((m) => m.role === "assistant")?.length >
    MAX_VERSIONS_PER_COMPONENT
  ) {
    throw new Error("more-than-x-versions");
  }

  if (!subscription && image) {
    throw new Error("payment-required-for-image");
  }

  const lastUserMessage =
    selectedVersion !== undefined
      ? await fetchUserMessageByChatIdAndVersion(id, selectedVersion)
      : await fetchLastUserMessageByChatId(id);
  if (!lastUserMessage) throw new Error("No last user message");

  // Utiliser le prompt détaillé s'il est disponible, sinon utiliser le prompt existant
  let updatedPrompt = enhancedPrompt || "";

  if (!enhancedPrompt) {
    updatedPrompt = lastUserMessage.content || "";
  }

  if (image) {
    const { data: imageData, error: imageError } = await supabase.storage
      .from("images")
      .upload(`${Date.now()}-${user?.id}`, image);
    if (imageError) {
      throw new Error("Failed to upload image");
    }

    updatedImage = imageData?.path;
  }

  if (lastUserMessage.version === -1 && lastUserMessage.prompt_image) {
    updatedImage = lastUserMessage.prompt_image;
  }

  return {
    messagesFromDatabase,
    subscription,
    framework: chat.framework,
    updatedPrompt, // Contient maintenant le prompt détaillé avec tous les détails du site
    updatedImage,
  };
};

const updateDataAfterCompletion = async (
  chatId: string,
  text: string,
  updatedPrompt: string,
  usage: LanguageModelUsage,
  updatedImage: string | null,
  finishReason: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providerMetadata: any,
) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    throw new Error("User not authenticated");
  }

  const subscription = await getSubscription();
  let subscriptionType = "trial";
  if (subscription) {
    subscriptionType =
      subscription.prices?.products?.name?.toLowerCase() || "trial";
  }

  const chat = await fetchChatById(chatId);
  if (!chat) return console.error("Could not get chat data");

  const lastUserMessage = await fetchLastUserMessageByChatId(chatId);
  if (!lastUserMessage) return console.error("Could not get chat messages");
  const newMessages = [];

  if (!text) {
    console.error("❌ updateDataAfterCompletion: No completion text provided");
    return;
  }

  console.log("=== updateDataAfterCompletion Debug ===");
  console.log("Text length:", text.length);
  console.log("Chat ID:", chatId);
  console.log("Finish reason:", finishReason);

  const version = lastUserMessage.version + 1;

  // FIXED: Use previous artifact code from messages instead of chats table
  const previousArtifactCode =
    (await getPreviousArtifactCode(chatId, version)) || "";
  const artifactCode = getUpdatedArtifactCode(text, previousArtifactCode);

  // Fetch current tokens
  const { data: currentChatData, error } = await supabase
    .from("chats")
    .select("input_tokens, output_tokens, title")
    .eq("id", chatId)
    .single();

  if (error) {
    console.error("Error fetching current tokens:", error);
    return;
  }

  const currentInputTokens = currentChatData?.input_tokens || 0;
  const currentOutputTokens = currentChatData?.output_tokens || 0;
  // Update with the sum of previous and new tokens
  if (currentChatData.title) {
    await supabase
      .from("chats")
      .update({
        artifact_code: artifactCode,
        input_tokens: currentInputTokens + usage.promptTokens,
        output_tokens: currentOutputTokens + usage.completionTokens,
      })
      .eq("id", chatId);
  } else {
    await supabase
      .from("chats")
      .update({
        artifact_code: artifactCode,
        title: extractTitle(text),
        input_tokens: currentInputTokens + usage.promptTokens,
        output_tokens: currentOutputTokens + usage.completionTokens,
      })
      .eq("id", chatId);
  }
  const cacheCreationInputTokens =
    providerMetadata?.anthropic?.cacheCreationInputTokens || 0;
  const cacheReadInputTokens =
    providerMetadata?.anthropic?.cacheReadInputTokens || 0;
  if (version > 0) {
    newMessages.push({
      chat_id: chatId,
      screenshot: null,
      version,
      content: updatedPrompt,
      role: "user",
      prompt_image: updatedImage,
      input_tokens: usage.promptTokens,
      subscription_type: subscriptionType,
      cache_creation_input_tokens: cacheCreationInputTokens,
      cache_read_input_tokens: cacheReadInputTokens,
    });
  } else {
    await supabase
      .from("messages")
      .update({
        version,
        input_tokens: usage.promptTokens,
        cache_creation_input_tokens: cacheCreationInputTokens,
        cache_read_input_tokens: cacheReadInputTokens,
        subscription_type: subscriptionType,
      })
      .eq("chat_id", chatId)
      .eq("version", -1);
  }

  const theme = extractDataTheme(text);

  // If we have a finishReason, add a special marker at the end of the content
  // that the client can detect and remove
  let content = text;
  let hasError = false;
  if (finishReason === "length" || finishReason === "error") {
    content = `${text}\n\n<!-- FINISH_REASON: ${finishReason} -->`;
    hasError = true;
  }
  newMessages.push({
    chat_id: chatId,
    screenshot: null,
    version,
    content: content,
    theme,
    role: "assistant",
    output_tokens: usage.completionTokens,
    subscription_type: subscriptionType,
    artifact_code: artifactCode,
    cache_creation_input_tokens: cacheCreationInputTokens,
    cache_read_input_tokens: cacheReadInputTokens,
  });

  const { error: newMessagesError } = await supabase
    .from("messages")
    .insert(newMessages)
    .eq("chat_id", chatId);
  if (newMessagesError) {
    console.error("Error inserting new messages:", newMessagesError);
  }

  after(async () => {
    if (hasError) {
      return;
    }
    if (chat.framework === Framework.HTML) {
      await takeScreenshot(chatId, version, theme, Framework.HTML);
    } else {
      await buildComponent(chatId, version);
    }

    // Auto-sync to GitHub après génération d'une nouvelle version
    await autoSyncToGithubAfterGeneration(chatId, version);
  });
};
