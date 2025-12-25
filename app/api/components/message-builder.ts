import { ModelMessage, ImagePart, TextPart } from "ai";

import { UploadedFileInfo } from "@/types/api";
import { Tables } from "@/types_db";
import { storageUrl } from "@/utils/config";
import { createClient } from "@/utils/supabase/server";

interface PromptFileItem {
  url: string;
  order: number;
  type?: string;
  mimeType?: string;
  source?: string;
}

export type { UploadedFileInfo } from "@/types/api";

interface ContextResult {
  limitedMessages: Tables<"messages">[];
  contextSummary?: string;
}

const MAX_VERSION_HISTORY = 10;
const MAX_INITIAL_VERSIONS = 3;
const SUMMARY_PREVIEW_LENGTH = 80;
const SUMMARY_MAX_ITEMS = 6;

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

export function parseFileItems(files: unknown): PromptFileItem[] {
  if (!Array.isArray(files)) return [];
  return files.filter(isValidFileItem);
}

const saveContextToDatabase = async (
  chatId: string,
  contextSummary: string,
  totalMessages: number,
) => {
  try {
    const supabase = await createClient();

    const { data: existingChat } = await supabase
      .from("chats")
      .select("metadata")
      .eq("id", chatId)
      .single();

    const existingMetadata = existingChat?.metadata || {};
    const newContextHistory = {
      lastSaved: new Date().toISOString(),
      totalMessages,
      contextSummary,
    };

    const updatedMetadata = Object.assign({}, existingMetadata, {
      contextHistory: newContextHistory,
    });

    await supabase
      .from("chats")
      .update({ metadata: updatedMetadata })
      .eq("id", chatId);
  } catch (error) {
    console.error("Failed to save context to database:", error);
  }
};

export const buildIntelligentContext = async (
  messages: Tables<"messages">[],
): Promise<ContextResult> => {
  if (messages.length === 0) {
    return { limitedMessages: [] };
  }

  const orderedVersions: number[] = [];
  const versionSet = new Set<number>();
  for (const message of messages) {
    if (!versionSet.has(message.version)) {
      versionSet.add(message.version);
      orderedVersions.push(message.version);
    }
  }

  const initialVersions = orderedVersions.slice(
    0,
    Math.min(MAX_INITIAL_VERSIONS, orderedVersions.length),
  );
  const recentVersions = orderedVersions.slice(-MAX_VERSION_HISTORY);
  const versionsToKeep = new Set([...initialVersions, ...recentVersions]);
  if (versionSet.has(-1)) {
    versionsToKeep.add(-1);
  }

  const limitedMessages = messages.filter((m) => versionsToKeep.has(m.version));
  const omittedMessages = messages.filter(
    (m) => !versionsToKeep.has(m.version),
  );

  let contextSummary: string | undefined;
  if (omittedMessages.length > 0) {
    const omittedVersions = Array.from(
      new Set(omittedMessages.map((m) => m.version)),
    );
    const userRequests = omittedMessages.filter((m) => m.role === "user");
    const recentUserRequests = userRequests.slice(-SUMMARY_MAX_ITEMS);
    const detailedThemes = recentUserRequests.map((m, idx) => {
      const content = m.content || "";
      const preview = content
        .substring(0, SUMMARY_PREVIEW_LENGTH)
        .replace(/\s+/g, " ")
        .trim();
      const needsEllipsis = content.length > SUMMARY_PREVIEW_LENGTH;
      return `${idx + 1}. ${preview}${needsEllipsis ? "..." : ""}`;
    });

    const summaryHeader = `[Omitted ${omittedVersions.length} versions totalling ${omittedMessages.length} messages]`;
    const summaryBody =
      detailedThemes.length > 0
        ? `\n\nRecent omitted user requests:\n${detailedThemes.join(
            "\n",
          )}\n\nContinue building upon the preserved versions.`
        : `\n\nAll critical user context is preserved in the included versions.`;
    contextSummary = summaryHeader + summaryBody;
  }

  if (contextSummary && messages.length > 0) {
    await saveContextToDatabase(
      messages[0].chat_id,
      contextSummary,
      messages.length,
    );
  }

  return {
    limitedMessages,
    contextSummary,
  };
};

export interface DomainInfo {
  subdomain?: string | null;
  customDomain?: string | null;
}

export const buildMessagesToOpenAi = async (
  messages: Tables<"messages">[],
  updatedPrompt: string,
  updatedImages: string[],
  selectedVersion?: number,
  uploadedFilesInfo?: UploadedFileInfo[],
  currentFilesContext?: string,
  componentTitle?: string | null,
  domainInfo?: DomainInfo | null,
): Promise<{ messagesToOpenAI: ModelMessage[] }> => {
  const getMessageFiles = (
    message: Tables<"messages">,
  ): Array<{
    url: string;
    type?: string;
    mimeType?: string;
    source?: string;
  }> => {
    if (message.files) {
      const fileItems = parseFileItems(message.files);
      return fileItems.sort((a, b) => a.order - b.order);
    }
    if (message.prompt_image) {
      return [{ url: message.prompt_image }];
    }
    return [];
  };

  const filteredMessages =
    selectedVersion !== undefined
      ? messages.filter((m) => m.version <= selectedVersion)
      : messages;

  const { limitedMessages, contextSummary } =
    await buildIntelligentContext(filteredMessages);

  const messagesToOpenAI = (await Promise.all(
    limitedMessages.map(async (m, index) => {
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

  let titleContext = "";
  if (componentTitle) {
    titleContext = `\n\n<component_title>\nThe component title is: "${componentTitle}"\nIMPORTANT: Use this exact title in the <coderocketArtifact title="${componentTitle}"> tag.\n</component_title>\n\n`;
  }

  let domainContext = "";
  if (domainInfo && (domainInfo.subdomain || domainInfo.customDomain)) {
    domainContext = `\n\n<deployment_domain>\nThis project is configured with the following deployment domains:\n`;
    if (domainInfo.subdomain) {
      domainContext += `- Subdomain: ${domainInfo.subdomain}.coderocket.app\n`;
    }
    if (domainInfo.customDomain) {
      domainContext += `- Custom domain: ${domainInfo.customDomain}\n`;
    }
    domainContext += `\nYou can use this information if the user needs to reference the deployed URL in their application (e.g., for sharing links, meta tags, or API endpoints).\n</deployment_domain>\n\n`;
  }

  const finalPromptText = currentFilesContext
    ? currentFilesContext +
      titleContext +
      domainContext +
      uploadedFilesContext +
      updatedPrompt
    : titleContext + domainContext + uploadedFilesContext + updatedPrompt;

  finalMessageContent.push({
    type: "text",
    text: finalPromptText,
  });

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

  messagesToOpenAI.push({
    role: "user",
    content:
      finalMessageContent.length > 1 ? finalMessageContent : finalPromptText,
  });

  return { messagesToOpenAI };
};
