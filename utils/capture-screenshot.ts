"use server";

import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

import { defaultTheme } from "./config";
import { createClient } from "./supabase/server";
/**
 * Lance Puppeteer pour prendre un screenshot d'une URL.
 * @param url L'adresse complète de la page à capturer (ex: https://<hash>.webcontainer.io).
 * @returns Buffer d'image PNG.
 */

async function getBrowser() {
  const executablePath = await chromium.executablePath();

  const browser = await puppeteerCore.launch({
    args: [
      ...chromium.args,
      "--disable-features=SameSiteByDefaultCookies", // Désactive les restrictions des cookies SameSite
      "--disable-features=CookiesWithoutSameSiteMustBeSecure", // Permet les cookies tiers non sécurisés
      "--disable-site-isolation-trials", // Désactive l'isolement des sites
      "--disable-blink-features=BlockCredentialedSubresources", // Autorise les ressources avec des credentials
      "--disable-popup-blocking", // Désactive le blocage des popups
      "--disable-infobars", // Supprime les infobars qui avertissent des popups
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });
  return browser;
}

export async function captureScreenshot(url: string, framework?: string) {
  // Lance un navigateur headless
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "credentialless",
  });
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

  // Attendre 60 secondes si ce n'est pas le framework HTML
  if (framework !== "html") {
    await new Promise((resolve) => setTimeout(resolve, 45000));
  }

  // Prend la capture d'écran au format PNG (renvoie un Buffer)
  const screenshot = await page.screenshot({
    type: "png",
  });

  await browser.close();
  return screenshot;
}

/**
 * Vérifie en base si on a déjà un screenshot pour (chatId, version).
 * Si oui, on ne fait rien.
 * Sinon, on appelle `captureScreenshot` pour générer l'image et la stocke dans Supabase.
 */
export const takeScreenshot = async (
  chatId: string,
  version: number,
  theme: string = defaultTheme,
  framework: string,
) => {
  const supabase = await createClient();
  // Si framework n'est pas html, on vérifie d'abord si un screenshot existe déjà
  if (framework !== "html") {
    const { data: existingMessage } = await supabase
      .from("messages")
      .select("screenshot")
      .eq("chat_id", chatId)
      .eq("version", version)
      .eq("role", "assistant")
      .single();

    if (existingMessage?.screenshot) {
      console.log("Screenshot already exists, skipping capture");
      return;
    }
  }

  // Sinon, on génère un screenshot.
  // Si `url` n'est pas fourni, on utilise un fallback (ex: votre site)
  const finalUrl =
    framework === "html"
      ? `https://www.tailwindai.dev/content/${chatId}`
      : `https://${chatId}-${version}.dev.tailwindai.dev`;

  const screenshot = await captureScreenshot(finalUrl, framework);
  if (!screenshot) {
    throw new Error("Failed to capture screenshot");
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
    return console.error("Could not find assistant message");
  }

  // On met à jour la colonne "screenshot" pour ce message
  await supabase
    .from("messages")
    .update({ screenshot: publicUrl })
    .eq("id", findAssistantMessage.id);

  console.log("Screenshot captured and stored successfully:", publicUrl);
};
