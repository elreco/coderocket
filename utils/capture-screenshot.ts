import captureWebsite from "capture-website";

export async function captureScreenshot(url: string) {
  try {
    const response = await captureWebsite.buffer(url);
    return response;
  } catch (error) {
    console.error("Error taking screenshot:", error);
    throw error;
  }
}
