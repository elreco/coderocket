import captureWebsite from "capture-website";
import chromium from "chrome-aws-lambda";

export async function captureScreenshot(url: string) {
  try {
    const response = await captureWebsite.buffer(url, {
      launchOptions: {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
      },
    });
    return response;
  } catch (error) {
    console.error("Error taking screenshot:", error);
    throw error;
  }
}
