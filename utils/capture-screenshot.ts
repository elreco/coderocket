import captureWebsite from "capture-website";
import chrome from "chrome-aws-lambda";

export async function captureScreenshot(url: string) {
  try {
    const response = await captureWebsite.buffer(url, {
      launchOptions: {
        args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
        defaultViewport: chrome.defaultViewport,
        executablePath: await chrome.executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
      },
    });
    return response;
  } catch (error) {
    console.error("Error taking screenshot:", error);
    throw error;
  }
}
