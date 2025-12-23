export const maxDuration = 300;
import { LanguageModelUsage, streamText, generateId } from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream/ioredis";

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
import { cloneWebsite } from "@/utils/agents/website-scraper-simple";
import { takeScreenshot } from "@/utils/capture-screenshot";
import {
  extractDataTheme,
  extractTitle,
  getUpdatedArtifactCode,
} from "@/utils/completion-parser";
import {
  Framework,
  anthropicModel,
  MAX_TOKENS_PER_REQUEST,
  PREMIUM_CHAR_LIMIT,
} from "@/utils/config";
import { isSameDomain } from "@/utils/domain-helper";
import { uploadFiles } from "@/utils/file-uploader";
import {
  buildIntegrationContext,
  getActiveChatIntegrations,
} from "@/utils/integrations/chat-integrations-helpers";
import { getPublisher, getSubscriber, isRedisConfigured } from "@/utils/redis";
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

import { buildMessagesToOpenAi, parseFileItems } from "./message-builder";
import { setActiveStreamId, tryAcquireGenerationLock } from "./post-processing";
import {
  optimizeMarkdownForWebsiteClone,
  filterJSLibrariesByFramework,
  formatAdvancedMetadata,
  AdvancedMetadata,
} from "./website-clone";

const getResumableStreamContext = () => {
  if (!isRedisConfigured()) {
    return null;
  }
  return createResumableStreamContext({
    waitUntil: after,
    publisher: getPublisher(),
    subscriber: getSubscriber(),
  });
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const id = formData.get("id") as string;
    const selectedVersionRaw = formData.get("selectedVersion");
    const parsedVersion =
      selectedVersionRaw !== null && selectedVersionRaw !== "undefined"
        ? Number(selectedVersionRaw)
        : undefined;
    const selectedVersion = Number.isNaN(parsedVersion)
      ? undefined
      : parsedVersion;
    const image = formData.get("image") as File | null;
    const files = formData.getAll("files") as File[];
    const libraryPathsStr = formData.get("libraryPaths") as string | null;
    const libraryPaths: string[] = libraryPathsStr
      ? JSON.parse(libraryPathsStr)
      : [];
    const prompt = formData.get("prompt") as string | null;
    const aiPrompt = formData.get("aiPrompt") as string | null;
    const selectedElementStr = formData.get("selectedElement") as string | null;
    const selectedElement = selectedElementStr
      ? (JSON.parse(selectedElementStr) as {
          html: string;
          tagName: string;
          classes: string[];
          dataAttributes: Record<string, string>;
          styles?: Record<string, string>;
          filePath?: string;
        })
      : null;

    const lockId = generateId();
    const lockAcquired = await tryAcquireGenerationLock(id, lockId);
    if (!lockAcquired) {
      return new Response(
        JSON.stringify({
          error: "Generation already in progress",
          code: "GENERATION_IN_PROGRESS",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

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
      libraryPaths,
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

    const { data: chatData } = await supabase
      .from("chats")
      .select("title")
      .eq("id", id)
      .single();
    const componentTitle = chatData?.title;

    const latestVersion = messagesFromDatabase.reduce((max, message) => {
      if (typeof message.version !== "number") {
        return max;
      }
      return Math.max(max, message.version);
    }, -1);

    const version = latestVersion + 1;

    let filesData;
    if (uploadedFilesInfo.length > 0 || updatedImages.length > 0) {
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
      const isFirstGeneration = lastUserMessage.version === -1;
      if (
        isFirstGeneration &&
        lastUserMessage.files &&
        Array.isArray(lastUserMessage.files)
      ) {
        filesData = parseFileItems(lastUserMessage.files);
      } else if (isFirstGeneration && lastUserMessage.prompt_image) {
        filesData = [
          {
            url: lastUserMessage.prompt_image,
            order: 0,
            type: "image",
            mimeType: "image/jpeg",
          },
        ];
      } else {
        filesData = [] as {
          url: string;
          order: number;
          type: string;
          mimeType: string;
          source?: string;
        }[];
      }
    }

    const subscription = await getSubscription();
    let subscriptionType = "trial";
    if (subscription) {
      subscriptionType =
        subscription.prices?.products?.name?.toLowerCase() || "trial";
    }

    // Déterminer si c'est un clonage d'une autre page
    const isCloneAnotherPage = userPromptForDisplay.includes(
      "Clone another page:",
    );
    const cloneAnotherPageUrl = isCloneAnotherPage
      ? userPromptForDisplay.match(
          /Clone another page:\s*(https?:\/\/[^\s]+)/,
        )?.[1] || null
      : null;

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
        selected_element: selectedElement,
        clone_another_page: cloneAnotherPageUrl,
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
        selected_element?: {
          html: string;
          tagName: string;
          classes: string[];
          dataAttributes: Record<string, string>;
          styles?: Record<string, string>;
          filePath?: string;
        } | null;
        clone_another_page?: string | null;
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
        selected_element: selectedElement,
        clone_another_page: cloneAnotherPageUrl,
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
      componentTitle,
    );

    // Add detailed logging for debugging
    // Add detailed logging for debugging cloning issues

    // Fetch active integrations for this chat
    const chatIntegrations = await getActiveChatIntegrations(id);
    const { context: integrationContext, errors: integrationErrors } =
      await buildIntegrationContext(chatIntegrations);

    if (integrationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Integration validation failed",
          details: integrationErrors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

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

    await setActiveStreamId(id, null);

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

        await setActiveStreamId(id, null);

        await updateDataAfterCompletion(
          id,
          finalText,
          usage,
          finalFinishReason,
          version,
        );
      },
      onError: async (error) => {
        console.error("=== AI Generation Error ===");
        console.error("Error details:", error);
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
        await setActiveStreamId(id, null);
      },
    });

    const streamContext = getResumableStreamContext();

    if (streamContext) {
      const streamId = generateId();
      await setActiveStreamId(id, streamId);

      const resumableStream = await streamContext.createNewResumableStream(
        streamId,
        () => stream.textStream,
      );

      if (resumableStream) {
        return new Response(resumableStream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Stream-Id": streamId,
          },
        });
      }
    }

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

const validateRequest = async (
  id: string,
  image: File | null,
  files: File[],
  prompt: string | null,
  aiPrompt: string | null,
  selectedVersion?: number,
  libraryPaths: string[] = [],
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

  const previousVersion =
    selectedVersion !== undefined && selectedVersion > 0
      ? selectedVersion - 1
      : selectedVersion;
  const currentArtifactCode =
    previousVersion !== undefined
      ? await getArtifactCodeByVersion(id, previousVersion)
      : chat.artifact_code || "";

  let currentFilesContext = "";
  if (currentArtifactCode) {
    const CONTEXT_MODE = process.env.CONTEXT_MODE || "balanced";
    const codeLimits = {
      minimal: 4000,
      balanced: 8000,
      full: 12000,
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

  // Vérifier si c'est un site cloné et récupérer les détails si nécessaire
  let enhancedPrompt = finalPrompt;
  let userDisplayPrompt = finalPrompt;
  let cloneScreenshot: string | null = null;

  let urlToClone: string | null = null;
  let isAdditionalPageClone = false;

  // Si chat.clone_url existe en base, c'est qu'on est dans un contexte de clonage
  if (chat.clone_url) {
    // Pour décider si on doit scraper, on se base d'abord sur le prompt courant (iteration),
    // puis, en fallback uniquement, sur le prompt enrichi initial.
    const promptToCheck = prompt || finalPrompt || aiPrompt || "";

    // Vérifier si c'est une demande de clonage d'une autre page
    if (promptToCheck.includes("Clone another page:")) {
      const anotherPageMatch = promptToCheck.match(
        /Clone another page:\s*(https?:\/\/[^\s]+)/,
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
    } else if (
      selectedVersion === undefined ||
      selectedVersion === 0 ||
      selectedVersion === -1
    ) {
      urlToClone = chat.clone_url;
    }
  }

  if (urlToClone) {
    const currentFramework: Framework = (chat.framework ||
      "react") as Framework;
    try {
      const cloneResult = await cloneWebsite(urlToClone);

      if (cloneResult.success && cloneResult.data) {
        const data = cloneResult.data;

        const videosData =
          (
            data as {
              videos?: Array<{
                url: string;
                type: string;
                platform: string;
                embedUrl?: string;
                videoId?: string;
                poster?: string | null;
              }>;
            }
          ).videos || [];

        console.log("🧠 Scrape payload sent to AI:", {
          url: urlToClone,
          title: data.title,
          description: data.description,
          htmlLength: data.html?.length || 0,
          markdownLength: data.markdown?.length || 0,
          hasScreenshot: Boolean(data.screenshot),
          images: data.images || [],
          videos: videosData,
          designMetadata: data.designMetadata || null,
        });

        // Optimiser le markdown pour réduire les tokens
        const optimizedMarkdown = data.markdown
          ? optimizeMarkdownForWebsiteClone(data.markdown)
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

        const videos = (
          data as {
            videos?: Array<{
              url: string;
              type: string;
              platform: string;
              embedUrl?: string;
              videoId?: string;
              poster?: string | null;
            }>;
          }
        ).videos;
        const videosList =
          videos && videos.length > 0
            ? `\n\n# VIDEO ASSETS\nUse these videos in your implementation:\n${videos
                .slice(0, 10)
                .map((video, idx) => {
                  if (video.platform === "youtube") {
                    return `${idx + 1}. YouTube: ${video.url} (embed: ${video.embedUrl || video.url})`;
                  } else if (video.platform === "vimeo") {
                    return `${idx + 1}. Vimeo: ${video.url} (embed: ${video.embedUrl || video.url})`;
                  } else {
                    return `${idx + 1}. Video: ${video.url}${video.poster ? ` (poster: ${video.poster})` : ""}`;
                  }
                })
                .join("\n")}`
            : "";

        const designMetadata = data.designMetadata as AdvancedMetadata | null;
        const simplifiedHTML =
          (data as { simplifiedHTML?: string }).simplifiedHTML || "";

        const advancedMetadataSection = formatAdvancedMetadata(designMetadata);

        const structureHTMLSection =
          simplifiedHTML &&
          simplifiedHTML.length > 0 &&
          simplifiedHTML.length < 5000
            ? `\n\n# HTML STRUCTURE\nUse this structure as reference for the page hierarchy:\n\`\`\`html\n${simplifiedHTML}\n\`\`\``
            : "";

        const filteredLibraries = designMetadata?.jsLibraries
          ? filterJSLibrariesByFramework(
              designMetadata.jsLibraries,
              currentFramework,
            )
          : [];
        const jsLibrariesSection =
          filteredLibraries.length > 0
            ? `\n\n# JAVASCRIPT LIBRARIES\nDetected libraries compatible with ${currentFramework}: ${filteredLibraries.map((lib) => lib.name).join(", ")}`
            : "";

        const frameworkInstruction = `IMPORTANT: Use ${currentFramework} (the selected framework) for the component structure. Use Tailwind CSS for all styling.${filteredLibraries.length > 0 ? ` Integrate the detected libraries (${filteredLibraries.map((lib) => lib.name).join(", ")}) for interactive features and animations, but ensure they are compatible with ${currentFramework}.` : ""} Match the responsive behavior implied by the detected layout patterns and breakpoints.`;

        const completenessInstruction = `CRITICAL: Recreate the ENTIRE page, not just what is visible in the screenshot. Use the markdown, HTML structure, section map and all extracted content to rebuild every section: header, navigation, hero, all main content sections, sidebars, long-scrolling content, footer, modals, popups, and any repeated blocks. If the screenshot stops before the end of the page, still generate the full page layout and content based on the provided text and structure. Every visible element in the screenshot must be recreated, and no logical section from the content is allowed to be omitted. Preserve the order and relative visual importance of sections as described in the metadata.`;

        if (isAdditionalPageClone) {
          enhancedPrompt = `Clone another page from the same website: ${urlToClone}

# VISUAL REFERENCE
A screenshot is attached. Use it as a visual reference for layout, colors, fonts, spacing, and design, but do not limit the implementation to only what is visible in the screenshot. Always combine it with the full content and structure provided below to recreate the complete page.${advancedMetadataSection}${structureHTMLSection}${jsLibrariesSection}

# CONTENT
Use this content in your implementation:

${optimizedMarkdown}${imagesList}${videosList}

**Instructions:**
${frameworkInstruction}

${completenessInstruction}

This is an additional page from the same website. Maintain consistency with the existing design system while incorporating the new content and layout from this page. The screenshot shows the design. The content above provides the text, images, and videos. Combine both to create an accurate clone.`;
        } else {
          enhancedPrompt = `Clone this website: ${urlToClone}

# VISUAL REFERENCE
A screenshot is attached. Use it as a visual reference for layout, colors, fonts, spacing, and design, but do not limit the implementation to only what is visible in the screenshot. Always combine it with the full content and structure provided below to recreate the complete page.${advancedMetadataSection}${structureHTMLSection}${jsLibrariesSection}

# CONTENT
Use this content in your implementation:

${optimizedMarkdown}${imagesList}${videosList}

**Instructions:**
${frameworkInstruction}

${completenessInstruction}

The screenshot shows the design. The content above provides the text, images, and videos. Combine both to create an accurate clone.`;
        }

        // Handle screenshot - already processed by builder, just upload
        if (cloneResult.data.screenshot) {
          try {
            const buffer = Buffer.from(cloneResult.data.screenshot, "base64");
            console.log(
              "Screenshot buffer size (from builder):",
              buffer.length,
              "bytes",
            );

            if (buffer.length < 100) {
              throw new Error("Screenshot buffer is too small, likely invalid");
            }

            const screenshotFileName = `${Date.now()}-${user?.id}-screenshot.jpg`;
            const { data: imageData, error: imageError } =
              await supabase.storage
                .from("images")
                .upload(screenshotFileName, buffer, {
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
            console.error("Error uploading screenshot:", screenshotError);
            console.log("Continuing without screenshot");
          }
        }
      } else {
        console.log("⚠️ Clone failed, continuing with URL only");
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

  const initialUserMessage = messagesFromDatabase.find(
    (m) => m.role === "user" && m.version === -1,
  ) as Tables<"messages"> | undefined;

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

  if (!subscription && (image || files.length > 0)) {
    throw new Error("payment-required-for-image");
  }

  const fetchedLastUserMessage =
    selectedVersion !== undefined
      ? await fetchUserMessageByChatIdAndVersion(id, selectedVersion)
      : await fetchLastUserMessageByChatId(id);

  const lastUserMessage: Tables<"messages"> =
    fetchedLastUserMessage ||
    ({
      id: -1,
      chat_id: id,
      content: prompt || aiPrompt || enhancedPrompt || "",
      role: "user",
      version: selectedVersion ?? 0,
      prompt_image: null,
      files: null,
    } as Tables<"messages">);

  // Utiliser le prompt détaillé s'il est disponible, sinon utiliser le prompt existant
  let updatedPrompt = enhancedPrompt || "";
  let userPromptForDisplay = userDisplayPrompt || "";

  if (!enhancedPrompt) {
    if (aiPrompt) {
      updatedPrompt = aiPrompt;
    } else {
      updatedPrompt = lastUserMessage.content || "";
    }
    if (prompt) {
      userPromptForDisplay = prompt;
    } else {
      userPromptForDisplay = lastUserMessage.content || "";
    }
  } else {
    if (prompt) {
      userPromptForDisplay = prompt;
    }
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

  // Support for files from library (already uploaded, just reference them)
  if (libraryPaths.length > 0) {
    for (const libraryPath of libraryPaths) {
      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(libraryPath);

      // Determine file type from path
      const ext = libraryPath.split(".").pop()?.toLowerCase() || "";
      let fileType: "image" | "pdf" | "text" = "image";
      let mimeType = "image/png";
      if (ext === "pdf") {
        fileType = "pdf";
        mimeType = "application/pdf";
      } else if (ext === "txt") {
        fileType = "text";
        mimeType = "text/plain";
      } else if (["jpg", "jpeg"].includes(ext)) {
        mimeType = "image/jpeg";
      } else if (ext === "gif") {
        mimeType = "image/gif";
      } else if (ext === "webp") {
        mimeType = "image/webp";
      }

      const isFigmaFile = libraryPath.toLowerCase().includes("figma");

      uploadedFilesInfo.push({
        path: libraryPath,
        publicUrl: publicUrlData.publicUrl,
        type: fileType,
        mimeType,
        source: isFigmaFile ? "figma" : undefined,
      });
      updatedImages.push(libraryPath);
    }
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

  const isFirstIterationTarget =
    selectedVersion === 0 || selectedVersion === undefined;
  if (isFirstIterationTarget && initialUserMessage) {
    if (initialUserMessage.files && Array.isArray(initialUserMessage.files)) {
      const parsedFiles = parseFileItems(initialUserMessage.files);
      parsedFiles.forEach((file) => {
        if (!updatedImages.includes(file.url)) {
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
        }
      });
    } else if (
      initialUserMessage.prompt_image &&
      !updatedImages.includes(initialUserMessage.prompt_image)
    ) {
      updatedImages.push(initialUserMessage.prompt_image);
      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(initialUserMessage.prompt_image);
      uploadedFilesInfo.push({
        path: initialUserMessage.prompt_image,
        publicUrl: publicUrlData.publicUrl,
        type: "image",
        mimeType: "image/jpeg",
      });
    }
  } else if (updatedImages.length === 0 && lastUserMessage.version === -1) {
    if (lastUserMessage.files && Array.isArray(lastUserMessage.files)) {
      const parsedFiles = parseFileItems(lastUserMessage.files);
      parsedFiles.forEach((file) => {
        if (!updatedImages.includes(file.url)) {
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
        }
      });
    } else if (
      lastUserMessage.prompt_image &&
      !updatedImages.includes(lastUserMessage.prompt_image)
    ) {
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
  usage: LanguageModelUsage,
  finishReason: string | null,
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

    let artifactCode: string;
    try {
      artifactCode = getUpdatedArtifactCode(text, previousArtifactCode);

      if (!artifactCode || artifactCode.trim() === "") {
        console.error(
          `[Patch] Generated artifact code is empty. Using previous artifact code to prevent corruption.`,
        );
        artifactCode = previousArtifactCode || chat.artifact_code || "";
      }

      if (!artifactCode.includes("<coderocketArtifact")) {
        console.error(
          `[Patch] Generated artifact code is malformed. Using previous artifact code to prevent corruption.`,
        );
        artifactCode = previousArtifactCode || chat.artifact_code || "";
      }
    } catch (error) {
      console.error(
        `[Patch] Error generating artifact code:`,
        error instanceof Error ? error.message : String(error),
      );
      console.error(
        `[Patch] Using previous artifact code to prevent corruption.`,
      );
      artifactCode = previousArtifactCode || chat.artifact_code || "";
    }

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
