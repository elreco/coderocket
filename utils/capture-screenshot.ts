import { Buffer } from "buffer";

import { screenshotApiUrl } from "./config";

export async function captureScreenshot(url: string) {
  const apiUrl = `${screenshotApiUrl}${encodeURIComponent(url)}`;
  console.log(apiUrl);
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
