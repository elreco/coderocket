"use server";

import { defaultTheme, screenshotApiUrl } from "./config";
import { createClient } from "./supabase/server";

export async function captureScreenshot(url: string, maxRetries = 5) {
  const apiUrl = `${screenshotApiUrl}${encodeURIComponent(url)}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch screenshot: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      lastError = error as Error;
      console.error(`Tentative ${attempt}/${maxRetries} échouée:`, error);

      if (attempt < maxRetries) {
        // Attendre un délai croissant entre chaque tentative (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }
    }
  }

  console.error(`Échec après ${maxRetries} tentatives`);
  throw lastError;
}

export const takeScreenshot = async (
  chatId: string,
  version: number,
  theme: string = defaultTheme,
  url?: string,
) => {
  const supabase = await createClient();

  // Vérifier d'abord si l'image existe déjà
  const { data: existingMessage } = await supabase
    .from("messages")
    .select("screenshot")
    .eq("chat_id", chatId)
    .eq("version", version)
    .eq("role", "assistant")
    .single();

  // Si l'image existe déjà, on arrête là
  if (existingMessage?.screenshot) {
    console.log("Screenshot already exists, skipping capture");
    return;
  }

  // Si l'image n'existe pas, utiliser screenshotBase64 ou faire la capture d'écran
  const screenshot = await captureScreenshot(
    url || `https://www.tailwindai.dev/content/${chatId}`,
  );

  const { error, data } = await supabase.storage
    .from("chat-images")
    .upload(`${chatId}/${version}-${theme}`, screenshot, {
      contentType: "image/png",
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
