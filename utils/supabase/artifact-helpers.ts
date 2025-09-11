import { createClient } from "./client";

export const getArtifactCodeByVersion = async (
  chatId: string,
  version?: number,
): Promise<string | null> => {
  const supabase = createClient();

  if (version !== undefined) {
    // Get artifact code from specific version
    const { data: message } = await supabase
      .from("messages")
      .select("artifact_code")
      .eq("chat_id", chatId)
      .eq("version", version)
      .eq("role", "assistant")
      .single();

    return message?.artifact_code || null;
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

    return message?.artifact_code || null;
  }
};

export const getLatestArtifactCode = async (
  chatId: string,
): Promise<string | null> => {
  return getArtifactCodeByVersion(chatId);
};

export const getPreviousArtifactCode = async (
  chatId: string,
  currentVersion: number,
): Promise<string | null> => {
  const supabase = createClient();

  // Get artifact code from the most recent assistant message before currentVersion
  const { data: message } = await supabase
    .from("messages")
    .select("artifact_code")
    .eq("chat_id", chatId)
    .eq("role", "assistant")
    .lt("version", currentVersion)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return message?.artifact_code || null;
};
