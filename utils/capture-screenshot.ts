"use server";

import puppeteer from "puppeteer";

import { defaultTheme } from "./config";
import { createClient } from "./supabase/server";

/**
 * Lance Puppeteer pour prendre un screenshot d'une URL.
 * @param url L'adresse complète de la page à capturer (ex: https://<hash>.webcontainer.io).
 * @returns Buffer d'image PNG.
 */
const captureScreenshot = async (url: string) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--remote-debugging-port=9222", // Port de débogage
        "--preview", // Mode prévisualisation (pour gérer les onglets séparés)
      ],
    });

    const page = await browser.newPage();

    // Définir la taille de la fenêtre à 1920x1080
    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    // Configurer l'interception des requêtes pour ajouter les en-têtes
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.resourceType() === "document") {
        request.continue({
          headers: {
            ...request.headers(),
            "Cross-Origin-Embedder-Policy": "credentialless",
            "Cross-Origin-Opener-Policy": "same-origin",
          },
        });
      } else {
        request.continue();
      }
    });

    // Accéder à l'URL de l'iframe (WebContainer)
    await page.goto(url, { waitUntil: "networkidle2" });

    // Prendre un screenshot
    const screenshotBuffer = await page.screenshot();

    // Fermer le navigateur
    await browser.close();

    return screenshotBuffer;
  } catch (error) {
    console.error("Erreur lors de la capture du screenshot : ", error);
    throw new Error("Échec de la capture");
  }
};

/**
 * Vérifie en base si on a déjà un screenshot pour (chatId, version).
 * Si oui, on ne fait rien.
 * Sinon, on appelle `captureScreenshot` pour générer l'image et la stocke dans Supabase.
 */
export const takeScreenshot = async (
  chatId: string,
  version: number,
  theme: string = defaultTheme,
  previewId?: string,
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

  if (existingMessage?.screenshot) {
    console.log("Screenshot already exists, skipping capture");
    return;
  }

  // Sinon, on génère un screenshot.
  // Si `url` n'est pas fourni, on utilise un fallback (ex: votre site)
  const finalUrl = previewId
    ? `https://www.tailwindai.dev/webcontainer/${previewId}`
    : `https://www.tailwindai.dev/content/${chatId}`;
  const screenshot = await captureScreenshot(finalUrl);
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
