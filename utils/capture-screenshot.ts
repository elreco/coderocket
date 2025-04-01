"use server";

import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

import { defaultTheme, Framework } from "./config";
import { createClient } from "./supabase/server";
/**
 * Lance Puppeteer pour prendre un screenshot d'une URL.
 * @param url L'adresse complète de la page à capturer (ex: https://<hash>.webcontainer.io).
 * @returns Buffer d'image PNG.
 */

export async function getBrowser() {
  const executablePath = await chromium.executablePath();
  const browser = await puppeteerCore.launch({
    args: [...chromium.args, "--disable-extensions"],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
    ignoreDefaultArgs: ["--disable-extensions"],
  });
  return browser;
}

export async function captureScreenshot(url: string) {
  // Lance un navigateur headless
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    // Configure la taille de la fenêtre
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 1,
    });

    // Ou bien lors du goto :
    await page.goto(url, {
      waitUntil: "networkidle0",
    });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    // Prend la capture d'écran au format PNG (renvoie un Buffer)
    const screenshot = await page.screenshot({
      type: "png",
    });

    await browser.close();
    return screenshot;
  } catch (error) {
    console.error("Failed to capture screenshot", error);
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
      ? `https://www.tailwindai.dev/content/${chatId}/${version}?noWatermark=true`
      : `https://${chatId}-${version}.webcontainer.tailwindai.dev`;

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
