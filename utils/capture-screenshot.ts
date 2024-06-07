import playwright from "playwright";

export async function captureScreenshot(url: string) {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const screen = await page.screenshot();
  await browser.close();
  return screen;
}
