"use server";

import {
  getUpdatedArtifactCode,
  extractFilesFromArtifact,
} from "../completion-parser";
import { Framework } from "../config";
import { defaultArtifactCode } from "../default-artifact-code";

import { createClient } from "./server";

export const getCompleteArtifactCodeByVersion = async (
  chatId: string,
  version?: number,
): Promise<string | null> => {
  const supabase = await createClient();

  // Get chat framework for default files
  const { data: chat } = await supabase
    .from("chats")
    .select("framework")
    .eq("id", chatId)
    .single();

  if (!chat) return null;

  let messageArtifactCode: string | null = null;

  if (version !== undefined) {
    // Get artifact code from specific version
    const { data: message } = await supabase
      .from("messages")
      .select("artifact_code")
      .eq("chat_id", chatId)
      .eq("version", version)
      .eq("role", "assistant")
      .single();

    messageArtifactCode = message?.artifact_code || null;
  } else {
    // Get artifact code from latest version
    const { data: message } = await supabase
      .from("messages")
      .select("artifact_code")
      .eq("chat_id", chatId)
      .eq("role", "assistant")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    messageArtifactCode = message?.artifact_code || null;
  }

  // If no artifact code from message, use default template
  if (!messageArtifactCode) {
    const framework = chat.framework as Framework;
    return (
      defaultArtifactCode[framework as keyof typeof defaultArtifactCode] || null
    );
  }

  // Check if artifact is complete (has essential files like package.json)
  const files = extractFilesFromArtifact(messageArtifactCode);
  const hasPackageJson = files.some((f) => f.name === "package.json");
  const hasConfig = files.some(
    (f) => f.name?.includes("config") || f.name?.includes("tsconfig"),
  );

  // If missing essential files, merge with default template
  if (!hasPackageJson || !hasConfig) {
    const framework = chat.framework as Framework;
    const defaultTemplate =
      defaultArtifactCode[framework as keyof typeof defaultArtifactCode] || "";

    // Merge message artifact with default template (message takes priority)
    if (defaultTemplate) {
      return getUpdatedArtifactCode(messageArtifactCode, defaultTemplate);
    }
  }

  return messageArtifactCode;
};

// Legacy function for backward compatibility
export const getArtifactCodeByVersion = async (
  chatId: string,
  version?: number,
): Promise<string | null> => {
  return getCompleteArtifactCodeByVersion(chatId, version);
};

export const getLatestArtifactCode = async (
  chatId: string,
): Promise<string | null> => {
  return getCompleteArtifactCodeByVersion(chatId);
};

export const getPreviousArtifactCode = async (
  chatId: string,
  currentVersion: number,
): Promise<string | null> => {
  // Get the complete artifact from the previous version
  return getCompleteArtifactCodeByVersion(chatId, currentVersion - 1);
};
