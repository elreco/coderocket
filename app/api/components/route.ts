export const maxDuration = 300;
import {
  ModelMessage,
  LanguageModelUsage,
  streamText,
  ImagePart,
  TextPart,
} from "ai";
import { after } from "next/server";
import sharp from "sharp";

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
  anthropicModel,
  storageUrl,
  MAX_TOKENS_PER_REQUEST,
  PREMIUM_CHAR_LIMIT,
  MAX_VERSIONS_PER_COMPONENT,
} from "@/utils/config";
import { isSameDomain } from "@/utils/domain-helper";
import { uploadFiles } from "@/utils/file-uploader";
import {
  buildIntegrationContext,
  getActiveChatIntegrations,
} from "@/utils/integrations/chat-integrations-helpers";
import {
  tokensToRockets,
  getPlanRocketLimits,
} from "@/utils/rocket-conversion";
import {
  getPreviousArtifactCode,
  getArtifactCodeByVersion,
} from "@/utils/supabase/artifact-helpers";
import { createClient } from "@/utils/supabase/server";
import { systemPrompt } from "@/utils/system-prompts";
import { htmlSystemPrompt } from "@/utils/system-prompts/html";
import { getUserTokenUsage, calculateTokenCost } from "@/utils/token-pricing";

interface ContextResult {
  limitedMessages: Tables<"messages">[];
  contextSummary?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function optimizeMarkdownForTokens(markdown: string): string {
  const maxLength = 15000;

  if (markdown.length <= maxLength) {
    return markdown;
  }

  const lines = markdown.split("\n");
  let result = "";
  let currentLength = 0;

  for (const line of lines) {
    if (currentLength + line.length > maxLength) {
      result += "\n\n... (content truncated to fit token limits) ...";
      break;
    }
    result += line + "\n";
    currentLength += line.length + 1;
  }

  return result.trim();
}

const buildIntelligentContext = async (
  messages: Tables<"messages">[],
): Promise<ContextResult> => {
  const CONTEXT_MODE = process.env.CONTEXT_MODE || "balanced";

  const contextSettings = {
    minimal: { baseMaxMessages: 30, maxCriticalMessages: 6 },
    balanced: { baseMaxMessages: 40, maxCriticalMessages: 8 },
    full: { baseMaxMessages: 50, maxCriticalMessages: 10 },
  };

  const { baseMaxMessages, maxCriticalMessages } =
    contextSettings[CONTEXT_MODE as keyof typeof contextSettings] ||
    contextSettings.balanced;

  if (messages.length <= baseMaxMessages) {
    return { limitedMessages: messages };
  }

  const avgContentLength =
    messages.reduce((sum, m) => sum + (m.content?.length || 0), 0) /
    messages.length;
  const totalContentLength = messages.reduce(
    (sum, m) => sum + (m.content?.length || 0),
    0,
  );

  const complexityFactor =
    avgContentLength > 2000 ? 0.6 : avgContentLength > 1000 ? 0.8 : 1.0;
  let dynamicMaxMessages = Math.floor(baseMaxMessages * complexityFactor);

  if (totalContentLength > 150000) {
    console.warn(
      "⚠️ Very large conversation detected, context reduction applied",
    );
    dynamicMaxMessages = Math.max(dynamicMaxMessages, 25);
  }

  const criticalMessages = messages.slice(0, maxCriticalMessages);

  const milestoneMessages = messages
    .slice(maxCriticalMessages)
    .filter(
      (m, index) =>
        (index + maxCriticalMessages) % 4 === 0 && m.role === "assistant",
    )
    .slice(-5);

  const recentMessages = messages.slice(-dynamicMaxMessages);

  const criticalVersions = new Set(criticalMessages.map((m) => m.version));
  const milestoneVersions = new Set(milestoneMessages.map((m) => m.version));

  const isNotDuplicate = (m: Tables<"messages">) =>
    !criticalVersions.has(m.version) && !milestoneVersions.has(m.version);

  const uniqueRecentMessages = recentMessages.filter(isNotDuplicate);

  let contextSummary: string | undefined;

  if (messages.length > dynamicMaxMessages + maxCriticalMessages) {
    const skippedMessages = messages.slice(
      maxCriticalMessages,
      -dynamicMaxMessages,
    );
    const userRequests = skippedMessages.filter((m) => m.role === "user");

    const CONTEXT_MODE = process.env.CONTEXT_MODE || "balanced";
    const summaryDepth =
      CONTEXT_MODE === "minimal" ? 5 : CONTEXT_MODE === "full" ? 12 : 8;

    const recentUserRequests = userRequests.slice(-summaryDepth);
    const detailedThemes = recentUserRequests.map((m, idx) => {
      const content = m.content || "";
      const preview = content.substring(0, 80).replace(/\n/g, " ");
      return `${idx + 1}. ${preview}${content.length > 80 ? "..." : ""}`;
    });

    const summaryFormat =
      CONTEXT_MODE === "minimal"
        ? `[${userRequests.length} interactions omitted. Build on existing code in current_project_state.]`
        : CONTEXT_MODE === "full"
          ? `[CONTEXT: ${userRequests.length} omitted interactions between initial setup and recent messages]\n\nRecent omitted requests:\n${detailedThemes.join("\n")}\n\nIMPORTANT: All previous code and decisions are preserved in current_project_state. Build incrementally.`
          : `[${userRequests.length} interactions omitted - showing ${summaryDepth} most recent]\n\n${detailedThemes.join("\n")}\n\nBuild on current_project_state.`;

    contextSummary = summaryFormat;
  }

  const combinedMessages = [
    ...criticalMessages,
    ...milestoneMessages,
    ...uniqueRecentMessages,
  ].sort((a, b) => a.version - b.version);

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
    const files = formData.getAll("files") as File[];
    const prompt = formData.get("prompt") as string | null;
    const aiPrompt = formData.get("aiPrompt") as string | null;

    // Valider la requête et récupérer les messages, le framework, et le prompt mis à jour
    // Si un site est cloné, cette fonction va aussi capturer et enregistrer un screenshot
    // qui sera ensuite envoyé à Anthropic avec le prompt

    const {
      messagesFromDatabase,
      framework,
      updatedPrompt,
      userPromptForDisplay,
      updatedImages,
      uploadedFilesInfo,
      currentFilesContext,
      lastUserMessage,
    } = await validateRequest(
      id,
      image,
      files,
      prompt,
      aiPrompt,
      selectedVersion,
    );

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const latestVersion = messagesFromDatabase.reduce((max, message) => {
      if (typeof message.version !== "number") {
        return max;
      }
      return Math.max(max, message.version);
    }, -1);

    const version = latestVersion + 1;

    let filesData;
    if (uploadedFilesInfo.length > 0) {
      filesData = updatedImages.map((url, index) => {
        const fileInfo = uploadedFilesInfo.find((f) => f.path === url);
        const existingFile = Array.isArray(lastUserMessage.files)
          ? (
              lastUserMessage.files as Array<{
                url: string;
                order: number;
                type?: string;
                mimeType?: string;
                source?: string;
              }>
            ).find((f) => f.url === url)
          : null;

        if (fileInfo) {
          const result: {
            url: string;
            order: number;
            type: string;
            mimeType: string;
            source?: string;
          } = {
            url,
            order: index,
            type: fileInfo.type,
            mimeType: fileInfo.mimeType,
          };

          if (fileInfo.source) {
            result.source = fileInfo.source;
          } else if (existingFile?.source) {
            result.source = existingFile.source;
          }

          return result;
        }

        if (existingFile) {
          return {
            url,
            order: index,
            type: existingFile.type || "image",
            mimeType: existingFile.mimeType || "application/octet-stream",
            ...(existingFile.source && { source: existingFile.source }),
          };
        }

        return { url, order: index };
      });
    } else {
      filesData = [] as {
        url: string;
        order: number;
        type: string;
        mimeType: string;
        source?: string;
      }[];
    }

    const subscription = await getSubscription();
    let subscriptionType = "trial";
    if (subscription) {
      subscriptionType =
        subscription.prices?.products?.name?.toLowerCase() || "trial";
    }

    if (version > 0) {
      const { error: insertError } = await supabase.from("messages").insert({
        chat_id: id,
        screenshot: null,
        version,
        content: userPromptForDisplay,
        role: "user",
        prompt_image: updatedImages.length > 0 ? updatedImages[0] : null,
        files: filesData,
        input_tokens: 0,
        subscription_type: subscriptionType,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      });

      if (insertError) {
        console.error("Error inserting user message:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create user message" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    } else {
      const updateData: {
        version: number;
        prompt_image?: string | null;
        files?: {
          url: string;
          order: number;
          type?: string;
          mimeType?: string;
          source?: string;
        }[];
        subscription_type: string;
      } = {
        version,
        prompt_image:
          updatedImages.length > 0
            ? updatedImages[0]
            : lastUserMessage.prompt_image,
        files:
          filesData.length > 0
            ? filesData
            : (lastUserMessage.files as {
                url: string;
                order: number;
                type?: string;
                mimeType?: string;
                source?: string;
              }[]) || [],
        subscription_type: subscriptionType,
      };

      const { error: updateError } = await supabase
        .from("messages")
        .update(updateData)
        .eq("chat_id", id)
        .eq("version", -1);

      if (updateError) {
        console.error("Error updating message:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update user message" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    const { messagesToOpenAI: messages } = await buildMessagesToOpenAi(
      messagesFromDatabase,
      updatedPrompt,
      updatedImages,
      selectedVersion,
      uploadedFilesInfo,
      currentFilesContext,
    );

    // Add detailed logging for debugging
    // Add detailed logging for debugging cloning issues

    // Fetch active integrations for this chat
    const chatIntegrations = await getActiveChatIntegrations(id);
    const integrationContext = await buildIntegrationContext(chatIntegrations);

    // Calculate input tokens to prevent context overflow
    const baseSystemPrompt =
      framework === Framework.HTML
        ? htmlSystemPrompt(
            messagesFromDatabase.length === 1
              ? messagesFromDatabase[0]?.theme
              : null,
          )
        : systemPrompt(framework as Framework);

    // Inject integration context into system prompt
    const systemPromptContent = integrationContext
      ? `${baseSystemPrompt}\n\n${integrationContext}`
      : baseSystemPrompt;

    // Rough token estimation (4 chars ≈ 1 token)
    const systemTokens = Math.ceil(systemPromptContent.length / 4);
    const messagesTokens = Math.ceil(JSON.stringify(messages).length / 4);
    const totalInputTokens = systemTokens + messagesTokens;

    console.log("=== Token Management ===");
    console.log("System prompt tokens (est):", systemTokens);
    console.log("Messages tokens (est):", messagesTokens);
    console.log("Total input tokens (est):", totalInputTokens);

    // Anthropic context limit is 200,000 tokens
    const contextLimit = 200000;
    const safetyMargin = 10000; // Safety margin for estimation errors
    const maxAllowedInput = contextLimit - safetyMargin;

    // Dynamically adjust max_tokens based on input size
    let dynamicMaxTokens = MAX_TOKENS_PER_REQUEST;
    if (totalInputTokens > maxAllowedInput) {
      console.warn(
        `⚠️ Input too large (${totalInputTokens} tokens), reducing context...`,
      );

      // Emergency context reduction - keep only most recent messages
      const reducedMessages = messages.slice(-5); // Keep only last 5 messages
      const reducedTokens = Math.ceil(
        JSON.stringify(reducedMessages).length / 4,
      );
      const newTotalInput = systemTokens + reducedTokens;

      console.log("Reduced to:", reducedMessages.length, "messages");
      console.log("New input tokens (est):", newTotalInput);

      // Update messages and recalculate
      messages.splice(0, messages.length, ...reducedMessages);

      // Still too big? Reduce max_tokens
      if (newTotalInput + dynamicMaxTokens > contextLimit) {
        dynamicMaxTokens = Math.max(
          8000,
          contextLimit - newTotalInput - safetyMargin,
        );
        console.log("Adjusted max_tokens to:", dynamicMaxTokens);
      }
    } else if (totalInputTokens + dynamicMaxTokens > contextLimit) {
      // Input OK but total would exceed limit
      dynamicMaxTokens = contextLimit - totalInputTokens - safetyMargin;
      console.log(
        "Adjusted max_tokens to:",
        dynamicMaxTokens,
        "to fit context limit",
      );
    }

    console.log("Final max_tokens:", dynamicMaxTokens);

    const stream = streamText({
      messages: [
        {
          role: "system",
          content: systemPromptContent,
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        ...messages,
      ],
      model: anthropicModel("claude-sonnet-4-5"),
      maxOutputTokens: dynamicMaxTokens,
      onStepFinish: async ({ text, usage, finishReason }) => {
        console.log("=== AI Generation Step Finished ===");
        console.log("Generated text length:", text?.length || 0);
        console.log("Finish reason:", finishReason);
        console.log("Usage:", usage);

        let finalText = text;
        let finalFinishReason = finishReason;
        if (!text || text.trim().length === 0) {
          console.error("❌ AI generation failed - no content produced");
          console.error("Finish reason was:", finishReason);
          console.error("Usage tokens:", usage);
          finalFinishReason = "error";
          finalText =
            "AI generation failed to produce content. This may be due to prompt complexity or API issues. Please try again with a simpler prompt.";
        } else {
          console.log(
            "✅ AI generation successful, content length:",
            text.length,
          );
        }

        await updateDataAfterCompletion(
          id,
          finalText,
          updatedPrompt,
          usage,
          updatedImages,
          finalFinishReason,
          uploadedFilesInfo,
          version,
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
    console.error("=== API Components Route Error ===");
    console.error("Error details:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Unknown error type:", typeof error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

interface PromptFileItem {
  url: string;
  order: number;
  type?: string;
  mimeType?: string;
  source?: string;
}

function isValidFileItem(item: unknown): item is PromptFileItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "url" in item &&
    typeof item.url === "string" &&
    "order" in item &&
    typeof item.order === "number"
  );
}

function parseFileItems(files: unknown): PromptFileItem[] {
  if (!Array.isArray(files)) return [];
  return files.filter(isValidFileItem);
}

const buildMessagesToOpenAi = async (
  messages: Tables<"messages">[],
  updatedPrompt: string, // Ce paramètre contient le prompt détaillé avec tous les détails du site
  updatedImages: string[],
  selectedVersion?: number,
  uploadedFilesInfo?: {
    path: string;
    publicUrl?: string;
    type: "image" | "pdf" | "text";
    mimeType: string;
    source?: string;
  }[],
  currentFilesContext?: string,
) => {
  // Helper function to extract file URLs from message
  const getMessageFiles = (
    message: Tables<"messages">,
  ): Array<{
    url: string;
    type?: string;
    mimeType?: string;
    source?: string;
  }> => {
    // Priority: files (JSONB array) > prompt_image (legacy single image)
    if (message.files) {
      const fileItems = parseFileItems(message.files);
      return fileItems.sort((a, b) => a.order - b.order);
    }
    if (message.prompt_image) {
      return [{ url: message.prompt_image }];
    }
    return [];
  };

  // Filter messages based on selectedVersion if provided
  const filteredMessages =
    selectedVersion !== undefined
      ? messages.filter((m) => m.version <= selectedVersion)
      : messages;

  // Intelligent context management instead of hard limit
  const { limitedMessages, contextSummary } =
    await buildIntelligentContext(filteredMessages);

  // Map messages to OpenAI format
  const messagesToOpenAI = (await Promise.all(
    limitedMessages.map(async (m, index) => {
      // Add context summary after the first few critical messages if available
      const hasSummary = Boolean(contextSummary);
      const isOptimalPosition =
        index === Math.min(5, limitedMessages.length - 1);
      const isUserMessage = m.role === "user";
      const shouldAddSummary = hasSummary && isOptimalPosition && isUserMessage;

      const messageFiles = getMessageFiles(m);

      if (m.role === "user" && messageFiles.length > 0) {
        const isNewProject = limitedMessages.length === 1;
        const baseContent = m.content || "";

        let textContent = baseContent;
        if (isNewProject) {
          textContent = `NEW PROJECT CodeRocket - ${baseContent}`;
        } else if (shouldAddSummary) {
          textContent = `${contextSummary}\n\n${baseContent}`;
        }

        const contentParts: Array<TextPart | ImagePart> = [
          {
            type: "text",
            text: textContent,
          },
        ];

        // Add files from the message, handling text files separately
        for (const file of messageFiles) {
          if (file.type === "text") {
            const response = await fetch(`${storageUrl}/${file.url}`);
            const textContent = await response.text();
            contentParts.push({
              type: "text",
              text: `\n\n<attached_file filename="${file.url.split("/").pop()}">\n${textContent}\n</attached_file>\n\n`,
            });
          } else if (file.type === "pdf") {
            const response = await fetch(`${storageUrl}/${file.url}`);
            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            contentParts.push({
              type: "file",
              data: uint8Array,
              mimeType: file.mimeType || "application/pdf",
            } as unknown as ImagePart);
          } else {
            contentParts.push({
              type: "image",
              image: new URL(`${storageUrl}/${file.url}`),
            });
          }
        }

        return {
          role: m.role as "user" | "assistant" | "tool" | "system",
          content: contentParts,
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
    }),
  )) as ModelMessage[];

  // Préparer le contenu du message final de l'utilisateur
  const finalMessageContent: Array<TextPart | ImagePart> = [];

  let uploadedFilesContext = "";
  if (uploadedFilesInfo && uploadedFilesInfo.length > 0) {
    const filesWithPublicUrls = uploadedFilesInfo.filter((f) => f.publicUrl);
    if (filesWithPublicUrls.length > 0) {
      uploadedFilesContext =
        "\n\n<uploaded_files>\nThe following files have been uploaded and are available at these public URLs. You can reference these URLs in your generated code:\n\n";
      filesWithPublicUrls.forEach((file, index) => {
        const fileNumber = index + 1;
        uploadedFilesContext += `${fileNumber}. ${file.type.toUpperCase()} file: ${file.publicUrl}\n`;
      });
      uploadedFilesContext +=
        "\nIMPORTANT: When referencing these files in your code (e.g., in <img> src attributes or other file references), use these exact public URLs.\n</uploaded_files>\n\n";
    }
  }

  // Toujours inclure le texte du prompt (avec le contexte des fichiers locked au début si présent)
  const finalPromptText = currentFilesContext
    ? currentFilesContext + uploadedFilesContext + updatedPrompt
    : uploadedFilesContext + updatedPrompt;

  finalMessageContent.push({
    type: "text",
    text: finalPromptText,
  });

  // Si des fichiers ont été uploadés (images ou PDFs)
  if (
    updatedImages.length > 0 &&
    uploadedFilesInfo &&
    uploadedFilesInfo.length > 0
  ) {
    for (let i = 0; i < updatedImages.length; i++) {
      const filePath = updatedImages[i];
      const fileInfo = uploadedFilesInfo.find((f) => f.path === filePath);

      if (fileInfo?.type === "pdf") {
        const response = await fetch(`${storageUrl}/${filePath}`);
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        finalMessageContent.push({
          type: "file",
          data: uint8Array,
          mimeType: fileInfo.mimeType,
        } as unknown as ImagePart);
      } else if (fileInfo?.type === "text") {
        const response = await fetch(`${storageUrl}/${filePath}`);
        const textContent = await response.text();

        const isFigmaFile = fileInfo.source === "figma";
        const filePrefix = isFigmaFile
          ? `\n\n<attached_file filename="${filePath.split("/").pop()}" type="figma-design">\n⚠️ IMPORTANT: This is a Figma design specification. You MUST preserve all existing code and components in the project. Only ADD new pages/components based on this design. DO NOT replace or remove existing functionality.\n\n`
          : `\n\n<attached_file filename="${filePath.split("/").pop()}">\n`;

        finalMessageContent.push({
          type: "text",
          text: `${filePrefix}${textContent}\n</attached_file>\n\n`,
        });
      } else {
        finalMessageContent.push({
          type: "image",
          image: new URL(`${storageUrl}/${filePath}`),
        });
      }
    }
  } else if (updatedImages.length > 0) {
    for (const imageUrl of updatedImages) {
      finalMessageContent.push({
        type: "image",
        image: new URL(`${storageUrl}/${imageUrl}`),
      });
    }
  }

  // Ajouter le dernier message de l'utilisateur avec le prompt détaillé et les images
  messagesToOpenAI.push({
    role: "user",
    content:
      finalMessageContent.length > 1 ? finalMessageContent : finalPromptText,
  });

  return { messagesToOpenAI };
};

const validateRequest = async (
  id: string,
  image: File | null,
  files: File[],
  prompt: string | null,
  aiPrompt: string | null,
  selectedVersion?: number,
): Promise<{
  messagesFromDatabase: Tables<"messages">[];
  subscription: Tables<"subscriptions"> | null;
  framework: Framework;
  updatedPrompt: string;
  userPromptForDisplay: string;
  updatedImages: string[];
  uploadedFilesInfo: {
    path: string;
    type: "image" | "pdf" | "text";
    mimeType: string;
    source?: string;
  }[];
  currentFilesContext: string;
  lastUserMessage: Tables<"messages">;
}> => {
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

  const currentArtifactCode =
    selectedVersion !== undefined
      ? await getArtifactCodeByVersion(id, selectedVersion)
      : chat.artifact_code || "";

  let currentFilesContext = "";
  if (currentArtifactCode) {
    const CONTEXT_MODE = process.env.CONTEXT_MODE || "balanced";
    const codeLimits = {
      minimal: 8000,
      balanced: 12000,
      full: 20000,
    };
    const codeLimit =
      codeLimits[CONTEXT_MODE as keyof typeof codeLimits] || 12000;

    const fileRegex = /<coderocketFile[^>]*name=["']([^"']+)["'][^>]*>/g;
    const lockedFilesRegex =
      /<coderocketFile[^>]*locked=["']true["'][^>]*name=["']([^"']+)["'][^>]*>|<coderocketFile[^>]*name=["']([^"']+)["'][^>]*locked=["']true["'][^>]*>/g;

    const allFiles: string[] = [];
    const lockedFiles: string[] = [];

    let match;
    while ((match = fileRegex.exec(currentArtifactCode)) !== null) {
      allFiles.push(match[1]);
    }

    while ((match = lockedFilesRegex.exec(currentArtifactCode)) !== null) {
      lockedFiles.push(match[1] || match[2]);
    }

    const codePreview =
      currentArtifactCode.length > codeLimit
        ? currentArtifactCode.substring(0, codeLimit) +
          `\n\n...(${Math.round((currentArtifactCode.length - codeLimit) / 1000)}k more chars - showing ${codeLimit / 1000}k/${Math.round(currentArtifactCode.length / 1000)}k total)`
        : currentArtifactCode;

    currentFilesContext = `\n\n<current_project_state>\nProject has ${allFiles.length} files: ${allFiles.join(", ")}\n\nCurrent code:\n${codePreview}\n</current_project_state>\n\n`;

    if (lockedFiles.length > 0) {
      currentFilesContext += `<locked_files>\nLocked files (DO NOT modify): ${lockedFiles.join(", ")}\n</locked_files>\n\n`;
    }
  }

  const optimizeMarkdownForTokens = (markdown: string): string => {
    const sections: { [key: string]: string } = {};
    let currentSection = "";
    let currentContent = "";

    markdown.split("\n").forEach((line) => {
      if (line.startsWith("## ")) {
        if (currentSection) {
          sections[currentSection] = currentContent;
        }
        currentSection = line.replace("## ", "");
        currentContent = "";
      } else {
        currentContent += line + "\n";
      }
    });
    if (currentSection) {
      sections[currentSection] = currentContent;
    }

    let optimized = "";

    if (sections["Quick Summary"]) {
      optimized += "## Quick Summary\n" + sections["Quick Summary"] + "\n";
    }

    if (sections["Full Page Structure"]) {
      const lines = sections["Full Page Structure"].split("\n");
      const limited = lines.slice(0, 120).join("\n");
      optimized += "## Page Structure\n" + limited + "\n\n";
    }

    if (sections["Visual Design System"]) {
      const lines = sections["Visual Design System"].split("\n");
      optimized += "## Design System\n" + lines.join("\n") + "\n\n";
    }

    if (sections["Typography System"]) {
      optimized += "## Typography\n" + sections["Typography System"] + "\n";
    }

    if (sections["Button Styles"]) {
      const lines = sections["Button Styles"].split("\n");
      const limited = lines.slice(0, 25).join("\n");
      optimized += "## Button Styles\n" + limited + "\n\n";
    }

    if (sections["Layout Components"]) {
      optimized += "## Layout Info\n" + sections["Layout Components"] + "\n";
    }

    if (sections["LOGOS (MUST INCLUDE):"]) {
      optimized += "## LOGOS\n" + sections["LOGOS (MUST INCLUDE):"] + "\n";
    }

    if (sections["VIDEOS:"]) {
      const lines = sections["VIDEOS:"].split("\n");
      const limited = lines.slice(0, 35).join("\n");
      optimized += "## Videos\n" + limited + "\n\n";
    }

    if (sections["IMAGES (ALL MUST BE INCLUDED):"]) {
      const lines = sections["IMAGES (ALL MUST BE INCLUDED):"].split("\n");
      const imageCount = lines.filter((l) => l.startsWith("### Image ")).length;
      let imageLines = 0;
      const limited = lines
        .filter((line) => {
          if (line.startsWith("### Image ")) imageLines++;
          return imageLines <= 20 || !line.startsWith("### Image ");
        })
        .slice(0, 400);

      optimized +=
        `## Key Images (Top 20 of ${imageCount})\n` +
        limited.join("\n") +
        "\n\n";
      if (imageCount > 20) {
        optimized += `(${imageCount - 20} more images available but prioritize the ones above)\n\n`;
      }
    }

    if (sections["Content Hierarchy"]) {
      const lines = sections["Content Hierarchy"].split("\n");
      const limited = lines.slice(0, 50).join("\n");
      optimized += "## Main Headings\n" + limited + "\n\n";
    }

    if (sections["Key Content Paragraphs"]) {
      const lines = sections["Key Content Paragraphs"].split("\n");
      const limited = lines.slice(0, 35).join("\n");
      optimized += "## Hero & Key Content\n" + limited + "\n\n";
    }

    if (sections["Button & Link Texts"]) {
      const lines = sections["Button & Link Texts"].split("\n");
      const limited = lines.slice(0, 25).join("\n");
      optimized += "## CTA & Navigation Text\n" + limited + "\n\n";
    }

    if (sections["Lists & Navigation Items"]) {
      const lines = sections["Lists & Navigation Items"].split("\n");
      const limited = lines.slice(0, 50).join("\n");
      optimized += "## Navigation\n" + limited + "\n\n";
    }

    optimized += `## HOW TO CLONE

**Primary Reference:** Use the SCREENSHOT as your main visual guide.

**Step-by-step approach:**
1. Analyze screenshot layout (sections, grid, spacing)
2. Apply exact colors from Design System (use bg-[#exact-color])
3. Include logos with exact URLs from LOGOS section
4. Import and use exact fonts from Typography section
5. Copy main headings and hero content from above sections
6. Add key images from Key Images section (use exact URLs)
7. Match button styles from Button Styles section
8. Follow page structure hierarchy

**Critical:**
✅ Screenshot = truth for layout and visual design
✅ Data above = specifications for colors, fonts, images, content
✅ No placeholders (no picsum, no lorem ipsum)
✅ Exact colors (use Tailwind arbitrary: bg-[#1a1a1a])
✅ Include all logos and hero images

**Goal:** Create a visual clone that matches the screenshot using exact specifications from the data.`;

    return optimized;
  };

  // Vérifier si c'est un site cloné et récupérer les détails si nécessaire
  let enhancedPrompt = finalPrompt;
  let userDisplayPrompt = finalPrompt;
  let cloneScreenshot: string | null = null;

  let urlToClone: string | null = null;
  let isAdditionalPageClone = false;

  if (chat.clone_url && !aiPrompt) {
    if (prompt?.includes("Clone this website:")) {
      urlToClone = chat.clone_url;
    } else if (prompt?.includes("Clone another page:")) {
      const anotherPageMatch = prompt.match(
        /Clone another page: (https?:\/\/[^\s]+)/,
      );
      if (anotherPageMatch && anotherPageMatch[1]) {
        const requestedUrl = anotherPageMatch[1];
        if (isSameDomain(chat.clone_url, requestedUrl)) {
          urlToClone = requestedUrl;
          isAdditionalPageClone = true;
          userDisplayPrompt = `Clone another page: ${requestedUrl}`;
        } else {
          throw new Error(
            "Cannot clone a page from a different domain. Please use a URL from the same website.",
          );
        }
      }
    }
  }

  if (urlToClone) {
    try {
      const cloneResult = await cloneWebsite(urlToClone);

      if (cloneResult.success && cloneResult.data) {
        const data = cloneResult.data;

        // Optimiser le markdown pour réduire les tokens
        const optimizedMarkdown = data.markdown
          ? optimizeMarkdownForTokens(data.markdown)
          : "";

        console.log("📊 Markdown optimization:");
        console.log("Original length:", data.markdown?.length || 0);
        console.log("Optimized length:", optimizedMarkdown.length);
        console.log(
          "Reduction:",
          Math.round(
            (1 - optimizedMarkdown.length / (data.markdown?.length || 1)) * 100,
          ) + "%",
        );

        const images = (
          data as {
            images?: Array<{ url: string; alt: string; isLogo: boolean }>;
          }
        ).images;
        const imagesList =
          images && images.length > 0
            ? `\n\n# IMAGE ASSETS\nUse these exact URLs for images:\n${images
                .filter((img) => img.isLogo)
                .map(
                  (img, idx) =>
                    `${idx + 1}. Logo: ${img.url} (alt: "${img.alt}")`,
                )
                .join("\n")}\n${images
                .filter((img) => !img.isLogo)
                .slice(0, 30)
                .map(
                  (img, idx) =>
                    `${idx + 1}. Image: ${img.url} (alt: "${img.alt}")`,
                )
                .join("\n")}`
            : "";

        if (isAdditionalPageClone) {
          enhancedPrompt = `Clone another page from the same website: ${urlToClone}

# VISUAL REFERENCE
A screenshot is attached - this is your PRIMARY reference. Study it carefully for layout, colors, fonts, spacing, and design.

# CONTENT
Use this content in your implementation:

${optimizedMarkdown}${imagesList}

**Instructions:** This is an additional page from the same website. Maintain consistency with the existing design system while incorporating the new content and layout from this page. The screenshot shows the design. The content above provides the text and images. Combine both to create an accurate clone.`;
        } else {
          enhancedPrompt = `Clone this website: ${urlToClone}

# VISUAL REFERENCE
A screenshot is attached - this is your PRIMARY reference. Study it carefully for layout, colors, fonts, spacing, and design.

# CONTENT
Use this content in your implementation:

${optimizedMarkdown}${imagesList}

**Instructions:** The screenshot shows the design. The content above provides the text and images. Combine both to create an accurate clone.`;
        }

        // Handle screenshot with proper dimension validation and resizing
        if (cloneResult.data.screenshot) {
          try {
            const buffer = Buffer.from(cloneResult.data.screenshot, "base64");
            console.log("Screenshot buffer size:", buffer.length, "bytes");

            // Read metadata from original buffer first
            const metadata = await sharp(buffer).metadata();

            console.log(
              "Original image dimensions:",
              metadata.width,
              "x",
              metadata.height,
            );
            console.log("Original format:", metadata.format);

            // Check if either dimension exceeds Anthropic's 8000px limit
            const maxDimension = 8000;
            const needsResize =
              (metadata.width || 0) > maxDimension ||
              (metadata.height || 0) > maxDimension;

            let processedBuffer: Buffer;
            if (needsResize && metadata.width && metadata.height) {
              console.log("⚠️ Image exceeds 8000px limit, resizing...");

              // Calculate new dimensions maintaining aspect ratio
              const aspectRatio = metadata.width / metadata.height;
              let newWidth = metadata.width;
              let newHeight = metadata.height;

              if (metadata.width > maxDimension) {
                newWidth = maxDimension;
                newHeight = Math.round(maxDimension / aspectRatio);
              }

              if (newHeight > maxDimension) {
                newHeight = maxDimension;
                newWidth = Math.round(maxDimension * aspectRatio);
              }

              console.log("Resizing to:", newWidth, "x", newHeight);
              processedBuffer = await sharp(buffer)
                .resize(newWidth, newHeight, {
                  fit: "inside",
                  withoutEnlargement: true,
                })
                .jpeg({ quality: 85 })
                .toBuffer();

              console.log(
                "Resized buffer size:",
                processedBuffer.length,
                "bytes",
              );
            } else {
              // Just convert to JPEG without resizing
              console.log("Converting to JPEG...");
              processedBuffer = await sharp(buffer)
                .jpeg({ quality: 85 })
                .toBuffer();
            }

            const screenshotFileName = `${Date.now()}-${user?.id}-screenshot.jpg`;
            const { data: imageData, error: imageError } =
              await supabase.storage
                .from("images")
                .upload(screenshotFileName, processedBuffer, {
                  contentType: "image/jpeg",
                  cacheControl: "3600",
                });

            if (!imageError && imageData?.path) {
              cloneScreenshot = imageData.path;
              console.log("✅ Screenshot uploaded successfully");
            } else {
              console.error("❌ Failed to upload screenshot:", imageError);
            }
          } catch (screenshotError) {
            console.error("Error processing screenshot:", screenshotError);
            console.log("Continuing without screenshot");
          }
        }
      } else {
        console.error("Failed to clone website:", cloneResult.error);
        const action = isAdditionalPageClone ? "another page" : "this website";
        enhancedPrompt = `Clone ${action}: ${urlToClone}

Unable to extract complete website data. Please recreate the visual layout and functionality based on the URL provided.
Use standard Tailwind CSS classes and shadcn/ui components.`;
      }
    } catch (error) {
      console.error("Error during website cloning:", error);
      if (
        error instanceof Error &&
        error.message.includes("different domain")
      ) {
        throw error;
      }
      const action = isAdditionalPageClone ? "another page" : "this website";
      enhancedPrompt = `Clone ${action}: ${urlToClone}

Unable to extract complete website data. Please recreate the visual layout and functionality based on the URL provided.
Use standard Tailwind CSS classes and shadcn/ui components.`;
    }
  }

  const messagesFromDatabase = await fetchMessagesByChatId(id);
  if (!messagesFromDatabase) throw new Error("Could not get chat messages");

  // Check subscription
  const subscription = await getSubscription();

  // Vérifier les messages supplémentaires achetés
  const extraMessages = await getExtraMessagesCount(user.id);

  if (subscription) {
    const currentPeriodStart = new Date(subscription.current_period_start);
    const currentPeriodEnd = new Date(subscription.current_period_end);

    const tokenUsage = await getUserTokenUsage(
      user.id,
      currentPeriodStart,
      currentPeriodEnd,
    );

    const planName = subscription.prices?.products?.name || "free";
    const limits = getPlanRocketLimits(planName);

    const rocketsUsed = tokensToRockets(
      tokenUsage.input_tokens + tokenUsage.output_tokens,
    );

    if (rocketsUsed >= limits.monthly_rockets) {
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
    const today = new Date();
    const currentPeriodStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );
    const currentPeriodEnd = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      1,
    );

    const tokenUsage = await getUserTokenUsage(
      user.id,
      currentPeriodStart,
      currentPeriodEnd,
    );

    const limits = getPlanRocketLimits("free");

    const rocketsUsed = tokensToRockets(
      tokenUsage.input_tokens + tokenUsage.output_tokens,
    );

    if (rocketsUsed >= limits.monthly_rockets) {
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

  if (!subscription && (image || files.length > 0)) {
    throw new Error("payment-required-for-image");
  }

  const lastUserMessage =
    selectedVersion !== undefined
      ? await fetchUserMessageByChatIdAndVersion(id, selectedVersion)
      : await fetchLastUserMessageByChatId(id);
  if (!lastUserMessage) throw new Error("No last user message");

  // Utiliser le prompt détaillé s'il est disponible, sinon utiliser le prompt existant
  let updatedPrompt = enhancedPrompt || "";
  let userPromptForDisplay = userDisplayPrompt || "";

  if (!enhancedPrompt) {
    updatedPrompt = lastUserMessage.content || "";
    userPromptForDisplay = lastUserMessage.content || "";
  }

  const updatedImages: string[] = [];
  const uploadedFilesInfo: {
    path: string;
    publicUrl?: string;
    type: "image" | "pdf" | "text";
    mimeType: string;
    source?: string;
  }[] = [];

  // Add clone screenshot if available
  if (cloneScreenshot) {
    updatedImages.push(cloneScreenshot);
    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(cloneScreenshot);
    uploadedFilesInfo.push({
      path: cloneScreenshot,
      publicUrl: publicUrlData.publicUrl,
      type: "image",
      mimeType: "image/jpeg",
      source: "clone",
    });
  }

  // Support for multiple files (images + PDFs)
  if (files.length > 0) {
    const uploadResult = await uploadFiles(files, user?.id);
    if (uploadResult.success) {
      uploadResult.uploadedFiles.forEach((file, index) => {
        const originalFile = files[index];
        const isFigmaFile = originalFile?.name.toLowerCase().includes("figma");

        uploadedFilesInfo.push({
          ...file,
          source: isFigmaFile ? "figma" : undefined,
        });
        updatedImages.push(file.path);
      });
    }
  }
  // Support for single file (legacy/backward compatibility)
  else if (image) {
    const uploadResult = await uploadFiles([image], user?.id);
    if (uploadResult.success) {
      uploadResult.uploadedFiles.forEach((file) => {
        const isFigmaFile = image.name.toLowerCase().includes("figma");
        uploadedFilesInfo.push({
          ...file,
          source: isFigmaFile ? "figma" : undefined,
        });
        updatedImages.push(file.path);
      });
    }
  }

  // Legacy support: use existing files if version -1
  if (lastUserMessage.version === -1) {
    if (lastUserMessage.files && Array.isArray(lastUserMessage.files)) {
      const parsedFiles = parseFileItems(lastUserMessage.files);
      parsedFiles.forEach((file) => {
        updatedImages.push(file.url);
        const { data: publicUrlData } = supabase.storage
          .from("images")
          .getPublicUrl(file.url);
        uploadedFilesInfo.push({
          path: file.url,
          publicUrl: publicUrlData.publicUrl,
          type: (file.type as "image" | "pdf" | "text") || "image",
          mimeType: file.mimeType || "application/octet-stream",
          source: file.source,
        });
      });
    } else if (lastUserMessage.prompt_image) {
      updatedImages.push(lastUserMessage.prompt_image);
      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(lastUserMessage.prompt_image);
      uploadedFilesInfo.push({
        path: lastUserMessage.prompt_image,
        publicUrl: publicUrlData.publicUrl,
        type: "image",
        mimeType: "image/jpeg",
      });
    }
  }

  return {
    messagesFromDatabase,
    subscription,
    framework: (chat.framework || "react") as Framework,
    updatedPrompt,
    userPromptForDisplay,
    updatedImages,
    uploadedFilesInfo,
    currentFilesContext,
    lastUserMessage,
  };
};

const updateDataAfterCompletion = async (
  chatId: string,
  text: string,
  updatedPrompt: string,
  usage: LanguageModelUsage,
  updatedImages: string[],
  finishReason: string | null,
  uploadedFilesInfo: {
    path: string;
    type: "image" | "pdf" | "text";
    mimeType: string;
    source?: string;
  }[],
  version: number,
) => {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const chat = await fetchChatById(chatId);
    if (!chat) {
      console.error("Could not get chat data");
      return;
    }

    if (!text) {
      console.error(
        "❌ updateDataAfterCompletion: No completion text provided",
      );
      return;
    }

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
          input_tokens: currentInputTokens + (usage.inputTokens ?? 0),
          output_tokens: currentOutputTokens + (usage.outputTokens ?? 0),
        })
        .eq("id", chatId);
    } else {
      await supabase
        .from("chats")
        .update({
          artifact_code: artifactCode,
          title: extractTitle(text),
          input_tokens: currentInputTokens + (usage.inputTokens ?? 0),
          output_tokens: currentOutputTokens + (usage.outputTokens ?? 0),
        })
        .eq("id", chatId);
    }
    const cacheCreationInputTokens = 0;
    const cacheReadInputTokens = usage.cachedInputTokens ?? 0;

    const modelUsed = "claude-sonnet-4-5";
    const cost = calculateTokenCost(
      {
        input_tokens: usage.inputTokens ?? 0,
        output_tokens: usage.outputTokens ?? 0,
        cache_creation_input_tokens: cacheCreationInputTokens,
        cache_read_input_tokens: cacheReadInputTokens,
      },
      modelUsed,
    );

    const { error: updateUserError } = await supabase
      .from("messages")
      .update({
        input_tokens: usage.inputTokens ?? 0,
        cache_creation_input_tokens: cacheCreationInputTokens,
        cache_read_input_tokens: cacheReadInputTokens,
      })
      .eq("chat_id", chatId)
      .eq("version", version)
      .eq("role", "user");

    if (updateUserError) {
      console.error("Error updating user message:", updateUserError);
    }

    const theme = extractDataTheme(text);

    let content = text;
    let hasError = false;
    if (finishReason === "length" || finishReason === "error") {
      content = `${text}\n\n<!-- FINISH_REASON: ${finishReason} -->`;
      hasError = true;
    }

    const subscription = await getSubscription();
    let subscriptionType = "trial";
    if (subscription) {
      subscriptionType =
        subscription.prices?.products?.name?.toLowerCase() || "trial";
    }

    const { error: insertAssistantError, data: insertedMessage } =
      await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          screenshot: null,
          version,
          content: content,
          theme,
          role: "assistant",
          input_tokens: usage.inputTokens ?? 0,
          output_tokens: usage.outputTokens ?? 0,
          subscription_type: subscriptionType,
          artifact_code: artifactCode,
          cache_creation_input_tokens: cacheCreationInputTokens,
          cache_read_input_tokens: cacheReadInputTokens,
          cost_usd: cost,
          model_used: modelUsed,
        })
        .select()
        .single();

    if (insertAssistantError) {
      console.error("Error inserting assistant message:", insertAssistantError);
    }

    // Token tracking is done below in token_usage_tracking table

    if (insertedMessage) {
      await supabase.from("token_usage_tracking").insert({
        user_id: user.id,
        chat_id: chatId,
        message_id: insertedMessage.id,
        usage_type: "generation",
        model_used: modelUsed,
        input_tokens: usage.inputTokens ?? 0,
        output_tokens: usage.outputTokens ?? 0,
        cache_creation_input_tokens: cacheCreationInputTokens,
        cache_read_input_tokens: cacheReadInputTokens,
        cost_usd: cost,
      });
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

      await autoSyncToGithubAfterGeneration(chatId, version);
    });
  } catch (error) {
    console.error("=== updateDataAfterCompletion Error ===");
    console.error("ChatId:", chatId);
    console.error("Version:", version);
    console.error("Error details:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
};
