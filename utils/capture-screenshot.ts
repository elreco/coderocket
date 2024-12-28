import { Buffer } from "buffer";

import { screenshotApiUrl } from "./config";
import { createClient } from "./supabase/server";

export async function captureScreenshot(url: string) {
  const apiUrl = `${screenshotApiUrl}${encodeURIComponent(url)}`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch screenshot: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer;
  } catch (error) {
    console.error("Error taking screenshot:", error);
    throw error;
  }
}

export const takeScreenshot = async (
  chatId: string,
  version: number,
  theme: string,
) => {
  const supabase = await createClient();
  const screenshot = await captureScreenshot(
    `https://www.tailwindai.dev/content/${chatId}`,
  );
  const { error, data } = await supabase.storage
    .from("chat-images")
    .upload(`${chatId}/${version}-${theme}`, screenshot, {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: true,
    });
  if (error) {
    throw new Error("Failed to upload image to Supabase: " + error.message);
  }
  const { data: imageData } = supabase.storage
    .from("chat-images")
    .getPublicUrl(data.path);
  const { data: messagesData } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .eq("version", version)
    .eq("role", "assistant");
  const findAssistantMessage = messagesData?.find(
    (m) => m.role === "assistant",
  );

  if (!findAssistantMessage)
    return console.error("Could not find assistant message");
  findAssistantMessage.screenshot = imageData.publicUrl;
  await supabase
    .from("messages")
    .update({ screenshot: imageData.publicUrl })
    .eq("id", findAssistantMessage.id);
};
