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
import { createClient } from "@/utils/supabase/server";
import { systemPrompt } from "@/utils/system-prompts";
import { htmlSystemPrompt } from "@/utils/system-prompts/html";

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
      model: anthropicModel("claude-3-7-sonnet-latest"),
      toolChoice: "none",
      maxTokens: MAX_TOKENS_PER_REQUEST,
      onFinish: async ({ text, usage, finishReason }) => {
        await updateDataAfterCompletion(
          id,
          text,
          updatedPrompt,
          usage,
          updatedImage,
          finishReason,
        );
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

  // Limiter le nombre de messages à envoyer à l'API (par exemple, les 10 derniers)
  const maxMessagesToSend = 50;
  const limitedMessages =
    filteredMessages.length > maxMessagesToSend
      ? filteredMessages.slice(-maxMessagesToSend)
      : filteredMessages;

  // Map messages to OpenAI format
  const messagesToOpenAI = limitedMessages.map((m) => {
    if (m.role === "user" && m.prompt_image) {
      return {
        role: m.role as "user" | "assistant" | "tool" | "system",
        content: [
          {
            type: "text",
            text:
              limitedMessages.length === 1
                ? `NEW PROJECT CodeRocket - ${m.content}`
                : m.content,
          },
          {
            type: "image",
            image: new URL(`${storageUrl}/${m.prompt_image}`),
          },
        ],
      };
    }

    return {
      role: m.role as "user" | "assistant" | "tool" | "system",
      content:
        limitedMessages.length === 1 && m.role === "user"
          ? `NEW PROJECT CodeRocket - ${m.content}`
          : m.content,
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
        // Construire un prompt détaillé avec les informations du site
        enhancedPrompt = `Clone this website: ${chat.clone_url}

## GENERAL STRUCTURE
LAYOUT STRUCTURE:
${cloneResult.data.structure.layoutDescription || ""}

MAIN CONTENT STRUCTURE:
${JSON.stringify(cloneResult.data.structure.layout?.mainContentStructure || {})}

RESPONSIVE DESIGN DETAILS:
${JSON.stringify(cloneResult.data.structure.layout?.responsiveDetails || {})}

SECTIONS:
${JSON.stringify(cloneResult.data.structure.sections?.slice(0, 5) || [])}

## HTML STRUCTURE DETAILS
HTML STRUCTURE: The website contains detailed HTML structure information including head tags, semantic elements, DOM statistics, and significant elements. This information has been extracted to help you better recreate the website.

## VISUAL DESIGN
VISUAL PATTERNS:
${JSON.stringify(cloneResult.data.structure.visualPatterns || {})}

COLORS:
${JSON.stringify(cloneResult.data.structure.colors || [])}

FONTS:
${JSON.stringify(cloneResult.data.structure.fonts || [])}

FONT SOURCES:
${JSON.stringify(cloneResult.data.structure.fontSources || [])}

CSS VARIABLES:
${JSON.stringify(cloneResult.data.structure.cssVariables || {})}

## MEDIA RESOURCES
VIDEOS:
${JSON.stringify(cloneResult.data.videos?.slice(0, 5) || [])}

## INTERACTION ELEMENTS
MENU ITEMS:
${JSON.stringify(cloneResult.data.structure.menu || [])}

CALLS TO ACTION:
${JSON.stringify(cloneResult.data.structure.cta || [])}

BUTTON STYLES:
${JSON.stringify(cloneResult.data.structure.buttons || [])}

## STYLES AND DESIGN PATTERNS
IMAGE STYLES:
${JSON.stringify(cloneResult.data.structure.imageStyles || [])}

SPACING PATTERNS:
${cloneResult.data.structure.spacingPattern || ""}

META TAGS:
${JSON.stringify(cloneResult.data.metaTags || {})}

CSS CONTENT SAMPLES:
${JSON.stringify(cloneResult.data.cssContent?.slice(0, 10) || [])}

## IMAGE COLLECTIONS
IMAGES COUNT: ${cloneResult.data.imageCount || 0}

HERO/BACKGROUND IMAGES (${cloneResult.data.heroImages?.length || 0}):
${JSON.stringify(cloneResult.data.heroImages?.slice(0, 5) || [])}

LOGO IMAGES (${cloneResult.data.logoImages?.length || 0}):
${JSON.stringify(cloneResult.data.logoImages || [])}

BACKGROUND IMAGES (${cloneResult.data.backgroundImages?.length || 0}):
${JSON.stringify(cloneResult.data.backgroundImages?.slice(0, 5) || [])}

IMPORTANT VISIBLE IMAGES (${cloneResult.data.visibleImages?.length || 0}):
${JSON.stringify(cloneResult.data.visibleImages?.slice(0, 10) || [])}
`;

        // Si nous avons des captures d'écran, ajouter des instructions pour les consulter
        if (
          cloneResult.data.screenshot ||
          cloneResult.data.sectionScreenshots
        ) {
          enhancedPrompt += `\n\n## SCREENSHOT
NOTE: A screenshot of the website is included in this message. Use it as a reference to faithfully reproduce the layout and appearance. Pay attention to the following elements:
- Respect the visual hierarchy and spacing between elements
- Reproduce important visual effects such as shadows and rounded corners
- Ensure the color palette matches the original
- Maintain the responsive layout and identified breakpoints`;

          // Enregistrer la capture d'écran du site si disponible
          if (cloneResult.data.screenshot) {
            try {
              // Convertir base64 en Buffer
              const buffer = Buffer.from(cloneResult.data.screenshot, "base64");

              // Générer un nom de fichier unique
              const screenshotFileName = `${Date.now()}-${user?.id}-screenshot.jpg`;

              // Enregistrer le screenshot dans le bucket 'images'
              const { data: imageData, error: imageError } =
                await supabase.storage
                  .from("images")
                  .upload(screenshotFileName, buffer, {
                    contentType: "image/jpeg",
                    cacheControl: "3600",
                  });

              if (imageError) {
                console.error("Failed to upload screenshot:", imageError);
              } else {
                // Utiliser le chemin du screenshot pour le message multimodal
                updatedImage = imageData?.path;
              }
            } catch (screenshotError) {
              console.error("Error processing screenshot:", screenshotError);
            }
          }
        }
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des détails du site:",
        error,
      );
      // Continuer avec le prompt simple en cas d'erreur
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
      .is("chats.remix_chat_id", null);

    const { count: remixCount } = await supabase
      .from("messages")
      .select("*, chats!inner(*)", { count: "exact", head: true })
      .eq("chats.user_id", user.id)
      .gte("created_at", formatToTimestamp(currentPeriodStart))
      .not("chats.remix_chat_id", "is", null)
      .gt("version", 0);

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
      .is("chats.remix_chat_id", null);

    const { count: remixCount } = await supabase
      .from("messages")
      .select("*, chats!inner(*)", { count: "exact", head: true })
      .eq("chats.user_id", user.id)
      .gte("created_at", formatToTimestamp(currentPeriodStart))
      .not("chats.remix_chat_id", "is", null)
      .gt("version", 0);

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

  if (!text) return console.error("No completion");

  const version = lastUserMessage.version + 1;
  const artifactCode = getUpdatedArtifactCode(text, chat.artifact_code || "");

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
    });
  } else {
    await supabase
      .from("messages")
      .update({
        version,
        input_tokens: usage.promptTokens,
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
      return;
    }
    await buildComponent(chatId, version);
  });
};
