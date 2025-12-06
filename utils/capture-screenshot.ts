"use server";

import { builderApiUrl, defaultTheme, Framework } from "./config";
import { createClient } from "./supabase/server";
/**
 * Endpoint distant pour récupérer les captures d'écran.
 */
const SCREENSHOT_ENDPOINT = builderApiUrl
  ? `${builderApiUrl.replace(/\/$/, "")}/capture-screenshot`
  : null;

export async function captureScreenshot(url: string) {
  if (!SCREENSHOT_ENDPOINT) {
    console.error("Screenshot endpoint is not configured");
    return undefined;
  }

  try {
    const response = await fetch(SCREENSHOT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(
        `Remote screenshot responded with status ${response.status}`,
      );
    }

    const payload = await response.json();
    const base64Screenshot =
      payload?.data?.screenshot ?? payload?.screenshot ?? null;

    if (!base64Screenshot || typeof base64Screenshot !== "string") {
      throw new Error("Remote screenshot returned an invalid payload");
    }

    return Buffer.from(base64Screenshot, "base64");
  } catch (error) {
    console.error("Failed to capture screenshot remotely:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return undefined;
  }
}

/**
 * Vérifie en base si on a déjà un screenshot pour (chatId, version).
 * Si oui, on ne fait rien.
 * Sinon, on appelle `captureScreenshot` pour générer l'image et la stocke dans Supabase.
 * @returns The public URL of the screenshot, or undefined if no screenshot was created or found
 */
export const takeScreenshot = async (
  chatId: string,
  version: number,
  theme: string = defaultTheme,
  framework: string,
): Promise<string | undefined> => {
  const supabase = await createClient();
  // Si framework n'est pas html, on vérifie d'abord si un screenshot existe déjà
  if (framework !== Framework.HTML) {
    const { data: existingMessage } = await supabase
      .from("messages")
      .select("screenshot")
      .eq("chat_id", chatId)
      .eq("version", version)
      .eq("role", "assistant")
      .single();

    if (existingMessage?.screenshot) {
      console.log("Screenshot already exists, skipping capture");
      return existingMessage.screenshot;
    }
  }

  // Sinon, on génère un screenshot.
  // Si `url` n'est pas fourni, on utilise un fallback (ex: votre site)
  const finalUrl =
    framework === Framework.HTML
      ? `https://www.coderocket.app/content/${chatId}/${version}?noWatermark=true`
      : `https://${chatId}-${version}.webcontainer.coderocket.app`;

  const screenshot = await captureScreenshot(finalUrl);
  if (!screenshot) {
    return undefined;
  }
  // On stocke l'image dans le bucket "chat-images" de Supabase
  const uploadPath = `${chatId}/${version}-${theme}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("chat-images")
    .upload(uploadPath, screenshot, {
      contentType: "image/png",
      upsert: true,
    });
  if (uploadError) {
    throw new Error(
      "Failed to upload image to Supabase: " + uploadError.message,
    );
  }

  // Récupérer l'URL publique du fichier
  const { data: publicUrlData } = supabase.storage
    .from("chat-images")
    .getPublicUrl(uploadData.path);

  const publicUrl = publicUrlData.publicUrl;

  // On met à jour le message "assistant" pour y ajouter l'URL du screenshot
  const { data: messagesData } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .eq("version", version)
    .eq("role", "assistant");
  const findAssistantMessage = messagesData?.find(
    (m) => m.role === "assistant",
  );

  if (!findAssistantMessage) {
    console.error("Could not find assistant message");
    return publicUrl;
  }

  // On met à jour la colonne "screenshot" pour ce message
  await supabase
    .from("messages")
    .update({ screenshot: publicUrl })
    .eq("id", findAssistantMessage.id);

  console.log("Screenshot captured and stored successfully:", publicUrl);
  return publicUrl;
};
