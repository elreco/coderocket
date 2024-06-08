import webstackScreenshot from "webstack-screenshot";

export async function captureScreenshot(url: string) {
  const options = {
    url: url,
    width: 1920,
    height: 1080,
    fullPage: true,
  };

  try {
    const buffer = await webstackScreenshot(options);
    return buffer;
  } catch (error) {
    console.error("Error taking screenshot:", error);
    throw error;
  }
}
