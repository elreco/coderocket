import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import TurndownService from "turndown";
import * as cheerio from "cheerio";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

puppeteerExtra.use(StealthPlugin());

const ERROR_CODES = {
  VERCEL_SECURITY_CHECKPOINT: "PROTECTED_SITE:Vercel Security Checkpoint",
  CLOUDFLARE_PROTECTION: "PROTECTED_SITE:Cloudflare protection",
  BOT_PROTECTION: "PROTECTED_SITE:Bot protection detected",
  TIMEOUT: "TIMEOUT:Request timeout",
  DNS_ERROR: "DNS_ERROR:Domain not found",
  ACCESS_FORBIDDEN: "ACCESS_FORBIDDEN:403 Forbidden",
};

const SCRAPER_BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-blink-features=AutomationControlled",
  "--disable-features=IsolateOrigins,site-per-process",
  "--disable-web-security",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--window-size=1920,1080",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-infobars",
  "--disable-breakpad",
  "--disable-canvas-aa",
  "--disable-2d-canvas-clip-aa",
  "--disable-gl-drawing-for-tests",
  "--enable-webgl",
  "--font-render-hinting=none",
  "--enable-font-antialiasing",
  "--force-color-profile=srgb",
  "--disable-extensions",
  "--disable-default-apps",
  "--disable-sync",
  "--metrics-recording-only",
  "--no-first-run",
  "--safebrowsing-disable-auto-update",
  "--disable-ipc-flooding-protection",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomViewport() {
  const baseWidth = 1920;
  const baseHeight = 1080;
  return {
    width: Math.floor(baseWidth + Math.random() * 100 - 50),
    height: Math.floor(baseHeight + Math.random() * 100 - 50),
    deviceScaleFactor: 1,
  };
}

function getSessionPath(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, "_");
    return path.join(process.cwd(), ".sessions", `${domain}.json`);
  } catch {
    return null;
  }
}

async function saveSession(page, url) {
  try {
    const sessionPath = getSessionPath(url);
    if (!sessionPath) return;

    const cookies = await page.cookies();
    const localStorageData = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    });

    const sessionData = {
      cookies,
      localStorage: localStorageData,
      timestamp: Date.now(),
    };

    await fs.mkdir(path.dirname(sessionPath), { recursive: true });
    await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
  } catch {
    // Silently fail - session persistence is optional
  }
}

async function loadSession(page, url) {
  try {
    const sessionPath = getSessionPath(url);
    if (!sessionPath) return false;

    const sessionData = JSON.parse(await fs.readFile(sessionPath, "utf-8"));

    if (sessionData.cookies && sessionData.cookies.length > 0) {
      await page.setCookie(...sessionData.cookies);
    }

    if (sessionData.localStorage) {
      await page.evaluate((localStorageData) => {
        for (const [key, value] of Object.entries(localStorageData)) {
          localStorage.setItem(key, value);
        }
      }, sessionData.localStorage);
    }

    return true;
  } catch {
    return false;
  }
}

async function humanLikeDelay(min = 100, max = 300) {
  const delay = Math.floor(Math.random() * (max - min) + min);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function humanLikeInteraction(page) {
  try {
    await page.evaluate(() => {
      const scrollAmount = Math.random() * 200 + 50;
      window.scrollBy(0, scrollAmount);
    });
    await humanLikeDelay(200, 400);

    await page.evaluate(() => {
      window.scrollBy(0, -Math.random() * 100);
    });
    await humanLikeDelay(100, 200);
  } catch {
    // Ignore errors
  }
}

export function registerScraperRoutes(app, safeLog) {
  app.post("/scrape-simple", async (req, res) => {
    const { url } = req.body || {};

    if (!url || typeof url !== "string") {
      return res.status(400).send({
        success: false,
        error: "Missing url parameter",
      });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).send({
        success: false,
        error: "Invalid URL format",
      });
    }

    try {
      const data = await scrapeWebsiteSimpleRemote(url, safeLog);
      return res.send({
        success: true,
        data,
      });
    } catch (err) {
      const errorMessage = err.message || "Failed to scrape website";
      const isProtected = errorMessage.startsWith("PROTECTED_SITE:");

      if (isProtected) {
        safeLog(`⚠️ Protected site detected: ${errorMessage}`);
        return res.send({
          success: true,
          data: {
            html: "",
            markdown: "",
            title: "",
            description: null,
            url: url,
            screenshot: "",
            images: [],
            designMetadata: null,
            isProtected: true,
          },
        });
      }

      safeLog(`❌ Scraper error: ${errorMessage}`, true);
      return res.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });

  app.post("/capture-screenshot", async (req, res) => {
    const { url } = req.body || {};

    if (!url || typeof url !== "string") {
      return res.status(400).send({
        success: false,
        error: "Missing url parameter",
      });
    }

    let browser = null;

    try {
      safeLog(`📸 Starting screenshot capture for: ${url}`);
      browser = await getScraperBrowser();
      safeLog(`✅ Browser launched successfully`);
      const page = await browser.newPage();
      safeLog(`✅ New page created`);

      const screenshotViewport = getRandomViewport();
      await page.setViewport(screenshotViewport);
      safeLog(`✅ Viewport set to ${screenshotViewport.width}x${screenshotViewport.height}`);

      const screenshotUserAgent = getRandomUserAgent();
      await page.setUserAgent(screenshotUserAgent);
      safeLog(`✅ User agent set`);

      try {
        safeLog(`🌐 Navigating to ${url} (networkidle0)...`);
        await page.goto(url, {
          waitUntil: "networkidle0",
          timeout: 45000,
        });
        safeLog(`✅ Navigation successful (networkidle0)`);
      } catch (gotoError) {
        safeLog(`⚠️ Navigation with networkidle0 failed: ${gotoError.message}, trying domcontentloaded...`);
        try {
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45000,
          });
          safeLog(`✅ Navigation successful (domcontentloaded)`);
        } catch (gotoError2) {
          safeLog(`❌ Navigation failed completely: ${gotoError2.message}`, true);
          throw new Error(`Failed to navigate to ${url}: ${gotoError2.message}`);
        }
      }

      const pageUrl = page.url();
      const pageTitle = await page.title().catch(() => "unknown");
      safeLog(`📍 Current page URL: ${pageUrl}, Title: ${pageTitle}`);

      const cloudflareResult = await waitForCloudflareChallenge(page, safeLog);
      if (cloudflareResult.hadChallenge && cloudflareResult.stillBlocked) {
        const hasCaptcha = await detectCaptcha(page);
        if (hasCaptcha) {
          safeLog("❌ CAPTCHA detected during screenshot capture", true);
          throw new Error(ERROR_CODES.CLOUDFLARE_PROTECTION);
        }
      }

      safeLog(`⏳ Waiting for loaders to disappear...`);
      await waitForLoadersToDisappear(page, safeLog);
      safeLog(`✅ Loaders check completed`);

      safeLog(`🎬 Waiting for animations and GSAP...`);
      await waitForAnimationsAndGSAP(page);
      safeLog(`✅ Animations check completed`);

      safeLog(`⏳ Waiting 3 seconds before scrolling for animations to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      safeLog(`📜 Scrolling and waiting for images...`);
      try {
        await scrollAndWaitForImages(page);
        safeLog(`✅ Scrolling completed`);
      } catch (scrollError) {
        safeLog(`⚠️ Scrolling error (continuing anyway): ${scrollError.message}`);
      }

      safeLog(`⏳ Waiting 2 seconds after scroll for content to stabilize...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      safeLog(`🎚 Freezing animations before screenshot...`);
      try {
        await page.evaluate(() => {
          try {
            const style = document.createElement("style");
            style.innerHTML =
              "*{animation:none !important;transition:none !important;scroll-behavior:auto !important;}";
            document.head.appendChild(style);
          } catch {}

          try {
            const gsap = window["gsap"];
            if (gsap && gsap.globalTimeline) {
              try {
                gsap.globalTimeline.pause();
              } catch {}
            }
          } catch {}

          try {
            const ScrollTrigger = window["ScrollTrigger"];
            if (ScrollTrigger && ScrollTrigger.getAll) {
              try {
                ScrollTrigger.getAll().forEach((trigger) => {
                  try {
                    trigger.disable();
                  } catch {}
                });
              } catch {}
            }
          } catch {}
        });
        safeLog(`✅ Animations frozen`);
      } catch {
        safeLog(`⚠️ Failed to freeze animations (continuing anyway)`);
      }

      const pageState = await page.evaluate(() => {
        return {
          readyState: document.readyState,
          bodyExists: !!document.body,
          bodyHeight: document.body ? document.body.scrollHeight : 0,
          bodyWidth: document.body ? document.body.scrollWidth : 0,
        };
      }).catch(() => ({ readyState: "unknown", bodyExists: false }));
      safeLog(`📊 Page state before screenshot: ${JSON.stringify(pageState)}`);

      if (!pageState.bodyExists) {
        throw new Error("Page body does not exist, cannot take screenshot");
      }

      safeLog(`📸 Taking screenshot...`);
      const screenshotBuffer = await page.screenshot({
        type: "png",
        fullPage: false,
        clip: {
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
        },
      });

      if (!screenshotBuffer) {
        throw new Error("Screenshot returned null or undefined");
      }

      const bufferSize = Buffer.isBuffer(screenshotBuffer)
        ? screenshotBuffer.length
        : screenshotBuffer.byteLength || 0;
      safeLog(`✅ Screenshot captured successfully, size: ${bufferSize} bytes`);

      const base64Screenshot = screenshotResultToBase64(screenshotBuffer);
      if (!base64Screenshot || base64Screenshot.length === 0) {
        throw new Error("Failed to convert screenshot to base64");
      }
      safeLog(`✅ Screenshot converted to base64, length: ${base64Screenshot.length}`);

      return res.send({
        success: true,
        data: {
          screenshot: base64Screenshot,
        },
      });
    } catch (err) {
      safeLog(`❌ Screenshot error for ${url}: ${err.message}`, true);
      safeLog(`❌ Error stack: ${err.stack}`, true);
      return res.status(500).send({
        success: false,
        error: err.message || "Failed to capture screenshot",
      });
    } finally {
      if (browser) {
        safeLog(`🔒 Closing browser...`);
        await browser.close().catch((closeErr) => {
          safeLog(`⚠️ Error closing browser: ${closeErr.message}`);
        });
      }
    }
  });
}

async function getScraperBrowser(options = {}) {
  const { proxy, headless = true } = options;
  const args = [...SCRAPER_BROWSER_ARGS];

  if (proxy) {
    args.push(`--proxy-server=${proxy}`);
  }

  return puppeteerExtra.launch({
    headless: headless,
    args: args,
  });
}

async function handleCookiePopups(page) {
  try {
    const cookieSelectors = [
      'button[id*="accept"]',
      'button[class*="accept"]',
      'button[id*="cookie"]',
      'button[class*="cookie"]',
      'button:has-text("Accept")',
      'button:has-text("Accepter")',
      'button:has-text("Accept all")',
      'button:has-text("Tout accepter")',
      ".cookie-accept",
      "#cookie-accept",
    ];

    for (const selector of cookieSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          break;
        }
      } catch {
        continue;
      }
    }
  } catch {
    return;
  }
}

async function waitForSecurityCheck(page) {
  try {
    const isSecurityCheck = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      const title = document.title.toLowerCase();

      const securityIndicators = [
        "checking the site connection security",
        "checking your browser",
        "checking connection",
        "verifying connection",
        "please wait",
        "loading",
        "this page requires cookies",
      ];

      return securityIndicators.some(
        (indicator) =>
          bodyText.includes(indicator) || title.includes(indicator)
      );
    });

    if (isSecurityCheck) {
      await page
        .waitForFunction(
          () => {
            const bodyText = document.body.innerText.toLowerCase();
            const securityIndicators = [
              "checking the site connection security",
              "checking your browser",
              "checking connection",
              "verifying connection",
            ];

            const stillChecking = securityIndicators.some((indicator) =>
              bodyText.includes(indicator)
            );

            return !stillChecking && document.body.children.length > 1;
          },
          { timeout: 15000 }
        )
        .catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch {
    return;
  }
}

async function waitForLoadersToDisappear(page, safeLog) {
  try {
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const maxDuration = 10000;
        const start = performance.now();
        const checkLoaders = () => {
          const loaders = document.querySelectorAll(
            '[class*="loader"], [class*="loading"], [class*="spinner"], [class*="skeleton"], [data-loading], [aria-busy="true"]'
          );

          const visibleLoaders = Array.from(loaders).filter((el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.opacity !== "0" &&
              rect.width > 0 &&
              rect.height > 0
            );
          });

          const hasSkeleton = Array.from(
            document.querySelectorAll('[class*="skeleton"]')
          ).some((el) => {
            const style = window.getComputedStyle(el);
            return style.display !== "none" && style.visibility !== "hidden";
          });

          const isLoading =
            document.readyState !== "complete" ||
            document.querySelector('[data-loading="true"]') ||
            hasSkeleton;

          if (
            (visibleLoaders.length === 0 && !isLoading) ||
            performance.now() - start > maxDuration
          ) {
            resolve(true);
          } else {
            setTimeout(checkLoaders, 250);
          }
        };

        checkLoaders();
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    if (safeLog && typeof safeLog === "function") {
      safeLog(`⚠️ waitForLoadersToDisappear error: ${error.message}`);
    }
    return;
  }
}

async function waitForAnimationsAndGSAP(page) {
  try {
      const hasGSAP = await page.evaluate(() => {
        return (
          typeof window["gsap"] !== "undefined" ||
          typeof window["ScrollTrigger"] !== "undefined" ||
          document.querySelector('script[src*="gsap"]') !== null
        );
      });

    if (hasGSAP) {
      await page.evaluate(() => {
        return new Promise((resolve) => {
          const maxWait = 8000;
          const start = performance.now();

          const checkGSAP = () => {
            const gsap = window["gsap"];
            const ScrollTrigger = window["ScrollTrigger"];

            if (gsap && gsap.globalTimeline) {
              const activeTweens = gsap.globalTimeline
                .getChildren()
                .filter((child) => child.isActive());

              if (
                activeTweens.length === 0 ||
                performance.now() - start > maxWait
              ) {
                resolve(true);
                return;
              }
            }

            if (ScrollTrigger && ScrollTrigger.getAll) {
              const triggers = ScrollTrigger.getAll();
              if (triggers.length > 0) {
                setTimeout(() => resolve(true), 2000);
                return;
              }
            }

            if (performance.now() - start > maxWait) {
              resolve(true);
            } else {
              setTimeout(checkGSAP, 500);
            }
          };

          setTimeout(checkGSAP, 1000);
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch {
    return;
  }
}

async function detectCaptcha(page) {
  try {
    const captchaInfo = await page.evaluate(() => {
      const turnstileIframes = document.querySelectorAll('iframe[src*="turnstile"], iframe[src*="challenges.cloudflare.com"]');
      const recaptchaIframes = document.querySelectorAll('iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"]');
      const captchaForms = document.querySelectorAll('form[action*="captcha"], form[action*="challenge"]');

      return {
        hasTurnstile: turnstileIframes.length > 0,
        hasRecaptcha: recaptchaIframes.length > 0,
        hasCaptchaForm: captchaForms.length > 0,
        turnstileCount: turnstileIframes.length,
        recaptchaCount: recaptchaIframes.length,
      };
    });

    return captchaInfo.hasTurnstile || captchaInfo.hasRecaptcha || captchaInfo.hasCaptchaForm;
  } catch {
    return false;
  }
}

async function waitForCloudflareChallenge(page, safeLog) {
  try {
    const isCloudflareChallenge = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      const title = document.title.toLowerCase();
      const url = window.location.href.toLowerCase();

      return (
        bodyText.includes("checking your browser") ||
        bodyText.includes("cloudflare") ||
        bodyText.includes("just a moment") ||
        bodyText.includes("verifying you are human") ||
        bodyText.includes("ddos protection") ||
        bodyText.includes("please wait") ||
        title.includes("just a moment") ||
        title.includes("cloudflare") ||
        title.includes("attention required") ||
        url.includes("challenges.cloudflare.com") ||
        url.includes("challenge-platform")
      );
    });

    if (isCloudflareChallenge) {
      safeLog("⏳ Cloudflare challenge detected, waiting...");

      const hasCaptcha = await detectCaptcha(page);
      if (hasCaptcha) {
        safeLog("⚠️ CAPTCHA detected (Turnstile or reCAPTCHA)");
      }

      await page
        .waitForFunction(
          () => {
            const bodyText = document.body.innerText.toLowerCase();
            const url = window.location.href.toLowerCase();
            return (
              !bodyText.includes("checking your browser") &&
              !bodyText.includes("just a moment") &&
              !bodyText.includes("verifying you are human") &&
              !url.includes("challenges.cloudflare.com") &&
              !url.includes("challenge-platform") &&
              document.body.children.length > 1
            );
          },
          { timeout: 15000 }
        )
        .catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const stillBlocked = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        const url = window.location.href.toLowerCase();
        return (
          bodyText.includes("checking your browser") ||
          bodyText.includes("just a moment") ||
          url.includes("challenges.cloudflare.com")
        );
      });

      if (stillBlocked) {
        safeLog("⚠️ Still blocked by Cloudflare after wait");
        return { hadChallenge: true, stillBlocked: true };
      }

      safeLog("✅ Cloudflare challenge passed");
      return { hadChallenge: true, stillBlocked: false };
    }

    return { hadChallenge: false, stillBlocked: false };
  } catch {
    return { hadChallenge: false, stillBlocked: false };
  }
}

async function scrollAndWaitForImages(page) {
  try {
    await page.evaluate(async () => {
      const loadAllImages = () => {
        document.querySelectorAll("img[loading='lazy']").forEach((img) => {
          img.setAttribute("loading", "eager");
        });

        document.querySelectorAll("img[data-src]").forEach((img) => {
          const dataSrc = img.getAttribute("data-src");
          if (dataSrc && !img.getAttribute("src")) {
            img.setAttribute("src", dataSrc);
          }
        });

        document.querySelectorAll("img[data-srcset]").forEach((img) => {
          const dataSrcset = img.getAttribute("data-srcset");
          if (dataSrcset && !img.getAttribute("srcset")) {
            img.setAttribute("srcset", dataSrcset);
          }
        });
      };

      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      loadAllImages();

      let previousHeight = 0;
      let stableHeightCount = 0;
      let previousLoaded = 0;
      let stagnantPasses = 0;
      const maxDuration = 8000;
      const start = performance.now();

      while (performance.now() - start < maxDuration) {
        const currentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollY = window.scrollY;

        if (currentHeight === previousHeight) {
          stableHeightCount++;
        } else {
          stableHeightCount = 0;
        }

        const atBottom =
          scrollY + viewportHeight >= currentHeight - 10;

        if (!atBottom) {
          const beforeScroll = scrollY;
          window.scrollBy(0, viewportHeight * 0.8);
          await sleep(100);

          if (window.scrollY === beforeScroll) {
            window.scrollTo(0, currentHeight);
            await sleep(200);
          }
        }

        loadAllImages();
        await sleep(100);

        const completed = Array.from(document.images).filter(
          (img) => img.complete
        ).length;

        if (completed === previousLoaded) {
          stagnantPasses += 1;
        } else {
          stagnantPasses = 0;
        }

        previousLoaded = completed;
        previousHeight = currentHeight;

        if (atBottom && stableHeightCount >= 2 && stagnantPasses >= 2) {
          break;
        }

        await sleep(100);
      }

      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(500);

      loadAllImages();
      await sleep(300);

      window.scrollTo(0, 0);
      await sleep(300);
    });

    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) {
                resolve(true);
              } else {
                img.addEventListener("load", () => resolve(true));
                img.addEventListener("error", () => resolve(false));
                setTimeout(() => resolve(false), 4000);
              }
            })
        )
      );
    });

    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const finalHeight = await page.evaluate(() => {
      return document.documentElement.scrollHeight;
    });

    await page.setViewport({
      width: 1920,
      height: Math.min(finalHeight, 10000),
      deviceScaleFactor: 1,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch {
    return;
  }
}

function screenshotResultToBase64(result) {
  if (Buffer.isBuffer(result)) {
    return result.toString("base64");
  }
  return Buffer.from(result, "binary").toString("base64");
}

function extractImages(html, baseUrl) {
  const $ = cheerio.load(html);
  const images = [];
  const seenUrls = new Set();
  const maxImages = 60;

  const makeAbsoluteUrl = (candidate) => {
    if (!candidate) return "";
    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      return candidate;
    }
    if (candidate.startsWith("//")) return "https:" + candidate;
    if (candidate.startsWith("/")) {
      try {
        const base = new URL(baseUrl);
        return `${base.protocol}//${base.host}${candidate}`;
      } catch {
        return candidate;
      }
    }
    return candidate;
  };

  const addImage = (url, alt, isLogo) => {
    const absoluteUrl = makeAbsoluteUrl(url);
    if (!absoluteUrl) return;
    if (absoluteUrl.startsWith("data:image")) return;
    if (seenUrls.has(absoluteUrl)) return;
    seenUrls.add(absoluteUrl);
    images.push({
      url: absoluteUrl,
      alt: alt || "",
      isLogo: Boolean(isLogo),
    });
  };

  const getSrcFromSrcset = (srcset) => {
    if (!srcset) return "";
    const firstPart = srcset.split(",")[0].trim();
    const urlPart = firstPart.split(" ")[0].trim();
    return urlPart || "";
  };

  const logoSelectors = [
    "img[class*='logo']",
    "img[id*='logo']",
    "img[alt*='logo' i]",
    ".logo img",
    "#logo img",
    "header img:first-of-type",
    "nav img:first-of-type",
  ];

  logoSelectors.forEach((selector) => {
    $(selector).each((_, el) => {
      const src =
        $(el).attr("src") ||
        $(el).attr("data-src") ||
        getSrcFromSrcset($(el).attr("srcset")) ||
        getSrcFromSrcset($(el).attr("data-srcset"));
      if (src) {
        addImage(src, $(el).attr("alt") || "Logo", true);
      }
    });
  });

  $("img").each((_, el) => {
    const src =
      $(el).attr("src") ||
      $(el).attr("data-src") ||
      getSrcFromSrcset($(el).attr("srcset")) ||
      getSrcFromSrcset($(el).attr("data-srcset"));
    if (src) {
      addImage(src, $(el).attr("alt") || "", false);
    }
  });

  $("*[style*='background-image']").each((_, el) => {
    const style = $(el).attr("style") || "";
    const match = style.match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
    if (match && match[2]) {
      addImage(match[2], "", false);
    }
  });

  $("meta[property='og:image'], meta[name='og:image']").each((_, el) => {
    const content = $(el).attr("content");
    if (content) {
      addImage(content, "Open Graph image", false);
    }
  });

  $("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']").each(
    (_, el) => {
      const href = $(el).attr("href");
      if (href) {
        addImage(href, "Icon", false);
      }
    },
  );

  return images.slice(0, maxImages);
}

function extractVideos(html, baseUrl) {
  const $ = cheerio.load(html);
  const videos = [];
  const seenUrls = new Set();

  const makeAbsoluteUrl = (candidate) => {
    if (!candidate) return "";
    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      return candidate;
    }
    if (candidate.startsWith("//")) return "https:" + candidate;
    if (candidate.startsWith("/")) {
      try {
        const base = new URL(baseUrl);
        return `${base.protocol}//${base.host}${candidate}`;
      } catch {
        return candidate;
      }
    }
    return candidate;
  };

  const extractVideoId = (url, platform) => {
    if (platform === "youtube") {
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      return match ? match[1] : null;
    }
    if (platform === "vimeo") {
      const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  $("video").each((_, el) => {
    const src = $(el).attr("src");
    const poster = $(el).attr("poster");
    if (src && !seenUrls.has(src)) {
      seenUrls.add(src);
      videos.push({
        url: makeAbsoluteUrl(src),
        type: "video",
        poster: poster ? makeAbsoluteUrl(poster) : null,
        platform: "direct",
      });
    }

    $(el).find("source").each((_, sourceEl) => {
      const sourceSrc = $(sourceEl).attr("src");
      if (sourceSrc && !seenUrls.has(sourceSrc)) {
        seenUrls.add(sourceSrc);
        videos.push({
          url: makeAbsoluteUrl(sourceSrc),
          type: "video",
          poster: poster ? makeAbsoluteUrl(poster) : null,
          platform: "direct",
        });
      }
    });
  });

  $("iframe").each((_, el) => {
    const src = $(el).attr("src");
    if (!src) return;

    if (src.includes("youtube.com") || src.includes("youtu.be")) {
      const videoId = extractVideoId(src, "youtube");
      if (videoId && !seenUrls.has(`youtube:${videoId}`)) {
        seenUrls.add(`youtube:${videoId}`);
        videos.push({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: src,
          type: "video",
          platform: "youtube",
          videoId: videoId,
        });
      }
    } else if (src.includes("vimeo.com")) {
      const videoId = extractVideoId(src, "vimeo");
      if (videoId && !seenUrls.has(`vimeo:${videoId}`)) {
        seenUrls.add(`vimeo:${videoId}`);
        videos.push({
          url: `https://vimeo.com/${videoId}`,
          embedUrl: src,
          type: "video",
          platform: "vimeo",
          videoId: videoId,
        });
      }
    } else if (src.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) {
      if (!seenUrls.has(src)) {
        seenUrls.add(src);
        videos.push({
          url: makeAbsoluteUrl(src),
          type: "video",
          platform: "direct",
        });
      }
    }
  });

  return videos.slice(0, 10);
}

function htmlToMarkdown(html) {
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe, svg").remove();

  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  turndownService.remove(["script", "style", "noscript", "iframe"]);

  const cleanedHtml = $("body").html() || html;

  let markdown = turndownService.turndown(cleanedHtml);

  markdown = markdown
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("\n\n");

  markdown = markdown.replace(/\n{3,}/g, "\n\n");

  return markdown.substring(0, 50000);
}

function extractSimplifiedHTML(html) {
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe, svg").remove();

  const simplifyElement = (element, depth = 0) => {
    if (depth > 10) return "";

    const tag = element.tagName?.toLowerCase();
    if (!tag) return "";

    const classes = element.attribs?.class || "";
    const classList = classes.split(" ").filter((c) => c.trim()).slice(0, 3);
    const classAttr = classList.length > 0 ? ` class="${classList.join(" ")}"` : "";

    const id = element.attribs?.id ? ` id="${element.attribs.id}"` : "";

    let result = `<${tag}${id}${classAttr}>`;

    const children = element.children || [];
    let hasTextContent = false;

    children.forEach((child) => {
      if (child.type === "text") {
        const text = child.data?.trim();
        if (text && text.length > 0 && text.length < 100) {
          result += text;
          hasTextContent = true;
        }
      } else if (child.type === "tag") {
        const childHtml = simplifyElement(child, depth + 1);
        if (childHtml) {
          result += childHtml;
        }
      }
    });

    if (!hasTextContent && children.length === 0) {
      return `<${tag}${id}${classAttr} />`;
    }

    result += `</${tag}>`;
    return result;
  };

  const body = $("body");
  if (body.length === 0) {
    return "";
  }

  let simplified = "";
  const semanticTags = ["header", "nav", "main", "section", "article", "aside", "footer"];

  body.children().each((_, element) => {
    const tag = element.tagName?.toLowerCase();
    if (tag && (semanticTags.includes(tag) || ["div", "ul", "ol", "li"].includes(tag))) {
      const html = simplifyElement(element);
      if (html) {
        simplified += html + "\n";
      }
    }
  });

  if (simplified.length > 5000) {
    simplified = simplified.substring(0, 5000);
    const lastTag = simplified.lastIndexOf("</");
    if (lastTag > 0) {
      simplified = simplified.substring(0, lastTag);
    }
    simplified += "\n... (truncated)";
  }

  return simplified.trim();
}

async function extractDesignMetadata(page) {
  try {
    return await page.evaluate(() => {
      const getComputedStyles = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const styles = window.getComputedStyle(el);
        return {
          fontFamily: styles.fontFamily,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
        };
      };

      const bodyStyles = getComputedStyles("body");
      const h1Styles = getComputedStyles("h1");
      const buttonStyles = getComputedStyles("button, .btn, [role='button']");

      const colors = new Set();
      const fonts = new Set();

      if (bodyStyles) {
        colors.add(bodyStyles.color);
        colors.add(bodyStyles.backgroundColor);
        fonts.add(bodyStyles.fontFamily);
      }

      if (h1Styles) {
        colors.add(h1Styles.color);
        fonts.add(h1Styles.fontFamily);
      }

      if (buttonStyles) {
        colors.add(buttonStyles.color);
        colors.add(buttonStyles.backgroundColor);
        fonts.add(buttonStyles.fontFamily);
      }

      const primaryButton = document.querySelector(
        "button.primary, .btn-primary, [class*='primary']"
      );
      if (primaryButton) {
        const styles = window.getComputedStyle(primaryButton);
        colors.add(styles.backgroundColor);
        colors.add(styles.color);
      }

      const hasGSAP = typeof window["gsap"] !== "undefined";
      const hasScrollTrigger = typeof window["ScrollTrigger"] !== "undefined";
      const hasFramerMotion =
        typeof window["Framer"] !== "undefined" ||
        document.querySelector('script[src*="framer"]') !== null;

      return {
        colors: Array.from(colors)
          .filter((c) => c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent")
          .slice(0, 10),
        fonts: Array.from(fonts)
          .filter((f) => f && f !== "initial" && f !== "inherit")
          .map((f) => f.split(",")[0].trim().replace(/['"]/g, ""))
          .slice(0, 5),
        hasAnimations: hasGSAP || hasScrollTrigger || hasFramerMotion,
        animationLibrary: hasGSAP
          ? "GSAP"
          : hasFramerMotion
          ? "Framer Motion"
          : null,
      };
    });
  } catch {
    return null;
  }
}

async function extractAdvancedDesignMetadata(page) {
  try {
    return await page.evaluate(() => {
      const spacingValues = new Map();
      const typographySystem = {};
      const colorPalette = new Map();
      const layoutPatterns = {
        grid: false,
        flexbox: false,
        containerWidths: new Set(),
        breakpoints: new Set(),
      };
      const buttonPatterns = [];
      const cardPatterns = [];
      const navItemPatterns = [];
      const jsLibraries = [];
      const borderRadiusValues = new Map();
      const boxShadowValues = new Map();
      const gradientValues = new Map();

      const parseSpacingValue = (value) => {
        if (!value || value === "0" || value === "0px") return null;
        const match = value.match(/^(\d+(?:\.\d+)?)(px|rem|em|%)$/);
        if (match) {
          const num = parseFloat(match[1]);
          const unit = match[2];
          return { value: num, unit, raw: value };
        }
        return null;
      };

      const extractSpacing = (element) => {
        const styles = window.getComputedStyle(element);
        ["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "gap", "rowGap", "columnGap"].forEach((prop) => {
          const value = styles[prop];
          if (value) {
            const parsed = parseSpacingValue(value);
            if (parsed) {
              const key = `${parsed.value}${parsed.unit}`;
              spacingValues.set(key, (spacingValues.get(key) || 0) + 1);
            }
          }
        });
      };

      const extractTypography = (element, tag) => {
        const styles = window.getComputedStyle(element);
        if (!typographySystem[tag]) {
          typographySystem[tag] = {
            fontSize: styles.fontSize,
            lineHeight: styles.lineHeight,
            fontWeight: styles.fontWeight,
            letterSpacing: styles.letterSpacing,
            fontFamily: styles.fontFamily.split(",")[0].trim().replace(/['"]/g, ""),
          };
        }
      };

      const extractColors = (element) => {
        const styles = window.getComputedStyle(element);
        ["color", "backgroundColor", "borderColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"].forEach((prop) => {
          const color = styles[prop];
          if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent" && color !== "rgb(0, 0, 0)" && color !== "rgb(255, 255, 255)") {
            const context = prop === "color" ? "text" : prop.includes("background") ? "background" : "border";
            if (!colorPalette.has(color)) {
              colorPalette.set(color, { contexts: new Set() });
            }
            colorPalette.get(color).contexts.add(context);
          }
        });

        const radius = styles.borderRadius;
        if (radius && radius !== "0px" && radius !== "0") {
          borderRadiusValues.set(radius, (borderRadiusValues.get(radius) || 0) + 1);
        }

        const boxShadow = styles.boxShadow;
        if (boxShadow && boxShadow !== "none") {
          boxShadowValues.set(boxShadow, (boxShadowValues.get(boxShadow) || 0) + 1);
        }

        const backgroundImage = styles.backgroundImage;
        if (backgroundImage && backgroundImage.includes("gradient")) {
          gradientValues.set(backgroundImage, (gradientValues.get(backgroundImage) || 0) + 1);
        }
      };

      const detectLayoutPattern = (element) => {
        const styles = window.getComputedStyle(element);
        const display = styles.display;
        if (display === "grid") {
          layoutPatterns.grid = true;
        } else if (display === "flex") {
          layoutPatterns.flexbox = true;
        }

        const width = styles.width;
        if (width && width !== "auto" && width !== "100%") {
          const match = width.match(/^(\d+(?:\.\d+)?)(px|rem|em|%)$/);
          if (match) {
            const containerWidth = `${match[1]}${match[2]}`;
            layoutPatterns.containerWidths.add(containerWidth);
          }
        }

        const classList = Array.from(element.classList || []);
        classList.forEach((className) => {
          if (className.startsWith("sm:")) {
            layoutPatterns.breakpoints.add("sm");
          }
          if (className.startsWith("md:")) {
            layoutPatterns.breakpoints.add("md");
          }
          if (className.startsWith("lg:")) {
            layoutPatterns.breakpoints.add("lg");
          }
          if (className.startsWith("xl:")) {
            layoutPatterns.breakpoints.add("xl");
          }
          if (className.startsWith("2xl:")) {
            layoutPatterns.breakpoints.add("2xl");
          }
        });
      };

      const detectComponentPattern = (element) => {
        const tagName = element.tagName.toLowerCase();
        const classList = Array.from(element.classList);
        const classStr = classList.join(" ").toLowerCase();

        if (tagName === "button" || classStr.includes("btn") || element.getAttribute("role") === "button") {
          const styles = window.getComputedStyle(element);
          buttonPatterns.push({
            padding: styles.padding,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            borderRadius: styles.borderRadius,
            backgroundColor: styles.backgroundColor,
            color: styles.color,
          });
        } else if (classStr.includes("card") || classStr.includes("panel")) {
          const styles = window.getComputedStyle(element);
          cardPatterns.push({
            padding: styles.padding,
            borderRadius: styles.borderRadius,
            backgroundColor: styles.backgroundColor,
            boxShadow: styles.boxShadow,
          });
        } else if (tagName === "nav" || classStr.includes("nav") || classStr.includes("menu")) {
          const styles = window.getComputedStyle(element);
          navItemPatterns.push({
            padding: styles.padding,
            fontSize: styles.fontSize,
            color: styles.color,
          });
        }
      };

      const allElements = document.querySelectorAll("*");
      const processedTags = new Set();

      allElements.forEach((el) => {
        extractSpacing(el);
        extractColors(el);
        detectLayoutPattern(el);
        detectComponentPattern(el);

        const tag = el.tagName.toLowerCase();
        if (["h1", "h2", "h3", "h4", "h5", "h6", "p", "button", "a"].includes(tag) && !processedTags.has(tag)) {
          extractTypography(el, tag);
          processedTags.add(tag);
        }
      });

      const detectJSLibraries = () => {
        const libraryChecks = [
          { name: "three.js", check: () => typeof window["THREE"] !== "undefined" || document.querySelector('script[src*="three"]') !== null, type: "3D" },
          { name: "GSAP", check: () => typeof window["gsap"] !== "undefined" || document.querySelector('script[src*="gsap"]') !== null, type: "animation" },
          { name: "Framer Motion", check: () => typeof window["Framer"] !== "undefined" || document.querySelector('script[src*="framer"]') !== null, type: "animation" },
          { name: "React", check: () => typeof window["React"] !== "undefined" || document.querySelector('script[src*="react"]') !== null, type: "framework" },
          { name: "Vue", check: () => typeof window["Vue"] !== "undefined" || document.querySelector('script[src*="vue"]') !== null, type: "framework" },
          { name: "Svelte", check: () => typeof window["Svelte"] !== "undefined" || document.querySelector('script[src*="svelte"]') !== null, type: "framework" },
          { name: "Angular", check: () => typeof window["ng"] !== "undefined" || document.querySelector('script[src*="angular"]') !== null, type: "framework" },
          { name: "D3.js", check: () => typeof window["d3"] !== "undefined" || document.querySelector('script[src*="d3"]') !== null, type: "visualization" },
          { name: "Chart.js", check: () => typeof window["Chart"] !== "undefined" || document.querySelector('script[src*="chart"]') !== null, type: "visualization" },
          { name: "ScrollTrigger", check: () => typeof window["ScrollTrigger"] !== "undefined", type: "animation" },
        ];

        libraryChecks.forEach((lib) => {
          try {
            if (lib.check()) {
              jsLibraries.push({ name: lib.name, type: lib.type });
            }
          } catch (e) {
          }
        });
      };

      detectJSLibraries();

      const sortedSpacing = Array.from(spacingValues.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([value, count]) => ({ value, frequency: count }));

      const sortedColors = Array.from(colorPalette.entries())
        .slice(0, 20)
        .map(([color, data]) => ({
          color,
          contexts: Array.from(data.contexts),
        }));

        const sortedBorderRadius = Array.from(borderRadiusValues.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([value, count]) => ({ value, frequency: count }));

        const sortedBoxShadows = Array.from(boxShadowValues.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([value, count]) => ({ value, frequency: count }));

        const sortedGradients = Array.from(gradientValues.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([value, count]) => ({ value, frequency: count }));

      const uniqueButtons = buttonPatterns.slice(0, 5);
      const uniqueCards = cardPatterns.slice(0, 5);
      const uniqueNavItems = navItemPatterns.slice(0, 5);

        const cssVariables = [];
        try {
          const rootStyles = getComputedStyle(document.documentElement);
          const bodyStyles = getComputedStyle(document.body || document.documentElement);
          const seenVars = new Set();

          const collectVars = (styles, context) => {
            if (!styles) {
              return;
            }
            for (let i = 0; i < styles.length; i++) {
              const prop = styles[i];
              if (prop && prop.startsWith("--") && !seenVars.has(prop)) {
                const value = styles.getPropertyValue(prop);
                if (value && value.trim()) {
                  cssVariables.push({
                    name: prop,
                    value: value.trim(),
                    contexts: [context],
                  });
                  seenVars.add(prop);
                }
              }
            }
          };

          collectVars(rootStyles, "root");
          collectVars(bodyStyles, "body");
        } catch (e) {
        }

        const sectionElements = Array.from(document.querySelectorAll("header, main, section, footer, nav, aside"));
        const sections = [];

        sectionElements.forEach((el, index) => {
          const rect = el.getBoundingClientRect();
          if (!rect || rect.height === 0 || rect.width === 0) {
            return;
          }

          const tag = el.tagName.toLowerCase();
          const heading = el.querySelector("h1, h2, h3");
          const headingText = heading ? heading.textContent.trim().slice(0, 120) : "";
          const id = el.id || null;
          const classList = Array.from(el.classList || []);
          let selector = tag;

          if (id) {
            selector = `#${id}`;
          } else if (classList.length > 0) {
            selector = `${tag}.${classList.slice(0, 3).join(".")}`;
          }

          let type = tag;
          const textLower = (el.textContent || "").toLowerCase();
          if (tag === "header" || selector.includes("nav")) {
            type = "header";
          } else if (tag === "footer") {
            type = "footer";
          } else if (classList.some((c) => c.toLowerCase().includes("hero"))) {
            type = "hero";
          } else if (textLower.includes("pricing")) {
            type = "pricing";
          } else if (textLower.includes("features")) {
            type = "features";
          }

          sections.push({
            id,
            tag,
            title: headingText || null,
            selector,
            order: index,
            top: Math.round(rect.top),
            height: Math.round(rect.height),
            type,
          });
        });

        sections.sort((a, b) => a.top - b.top);

      return {
        spacing: sortedSpacing,
        typography: typographySystem,
        colors: sortedColors,
        layout: {
          usesGrid: layoutPatterns.grid,
          usesFlexbox: layoutPatterns.flexbox,
            containerWidths: Array.from(layoutPatterns.containerWidths).slice(
              0,
              10,
            ),
            breakpoints: Array.from(layoutPatterns.breakpoints).slice(0, 10),
        },
        components: {
          buttons: uniqueButtons,
          cards: uniqueCards,
          navItems: uniqueNavItems,
        },
        jsLibraries: jsLibraries,
        hasAnimations: jsLibraries.some((lib) => lib.type === "animation"),
        animationLibrary: jsLibraries.find((lib) => lib.type === "animation")?.name || null,
          borderRadius: sortedBorderRadius,
          boxShadows: sortedBoxShadows,
          gradients: sortedGradients,
          cssVariables,
          sections,
      };
    });
  } catch (error) {
    return null;
  }
}

async function scrapeWebsiteSimpleRemote(url, safeLog) {
  let browser = null;

  try {
    safeLog(`Starting remote scraping for: ${url}`);
    browser = await getScraperBrowser();
    const page = await browser.newPage();

    const viewport = getRandomViewport();
    await page.setViewport(viewport);

    const userAgent = getRandomUserAgent();
    await page.setUserAgent(userAgent);

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "sec-ch-ua":
        '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
      DNT: "1",
      Connection: "keep-alive",
    });

    await page.evaluateOnNewDocument(() => {
      const setProperty = (target, property, descriptor) => {
        if (!target) {
          return;
        }
        try {
          Object.defineProperty(target, property, {
            configurable: true,
            ...descriptor,
          });
        } catch {
          if ("value" in descriptor) {
            try {
              target[property] = descriptor.value;
            } catch {}
          }
        }
      };

      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });

      try {
        const navProto = Object.getPrototypeOf(navigator);
        if (navProto && navProto.webdriver !== undefined) {
          delete navProto.webdriver;
        }
      } catch {}

      setProperty(navigator, "plugins", {
        get: () => {
          const plugins = [];
          for (let i = 0; i < 5; i++) {
            plugins.push({
              name: `Plugin ${i}`,
              description: `Plugin ${i} description`,
              filename: `plugin${i}.dll`,
            });
          }
          return plugins;
        },
      });

      const userAgent = navigator.userAgent;
      const isMac = userAgent.includes("Macintosh");
      const isLinux = userAgent.includes("Linux");

      setProperty(navigator, "languages", {
        get: () => ["en-US", "en", "fr"],
      });

      setProperty(navigator, "platform", {
        get: () => isMac ? "MacIntel" : isLinux ? "Linux x86_64" : "Win32",
      });

      setProperty(navigator, "timezone", {
        get: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      setProperty(navigator, "hardwareConcurrency", {
        get: () => 8,
      });

      setProperty(navigator, "deviceMemory", {
        get: () => 8,
      });

      setProperty(window, "chrome", {
        value: {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {},
        },
        writable: true,
      });

      const originalQuery = window.navigator.permissions?.query;
      if (navigator.permissions && typeof navigator.permissions.query === "function") {
        setProperty(navigator.permissions, "query", {
          value: (parameters) =>
            parameters.name === "notifications"
              ? Promise.resolve({ state: Notification.permission })
              : originalQuery
              ? originalQuery(parameters)
              : Promise.resolve({ state: "granted" }),
          writable: true,
        });
      }
    });

    await page.evaluate(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    const sessionLoaded = await loadSession(page, url);
    if (sessionLoaded) {
      safeLog("✅ Loaded previous session data");
    }

    await humanLikeDelay(200, 400);

    await humanLikeInteraction(page);

      try {
        safeLog(`🌐 Navigating to ${url} (networkidle2)...`);
        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 45000,
        });
        safeLog(`✅ Navigation successful (networkidle2)`);
      } catch (gotoError) {
        safeLog(`⚠️ Navigation with networkidle2 failed: ${gotoError.message}, trying domcontentloaded...`);
        try {
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45000,
          });
          safeLog(`✅ Navigation successful (domcontentloaded)`);
        } catch (gotoError2) {
          safeLog(`❌ Navigation failed completely: ${gotoError2.message}`, true);
          throw new Error(`Failed to navigate to ${url}: ${gotoError2.message}`);
        }
      }

      const pageUrl = page.url();
      const pageTitle = await page.title().catch(() => "unknown");
      safeLog(`📍 Current page URL: ${pageUrl}, Title: ${pageTitle}`);

    await new Promise((resolve) => setTimeout(resolve, 600));

    const pageTitleLower = pageTitle.toLowerCase();
    const isVercelCheckpoint = pageTitleLower.includes("vercel security checkpoint") ||
                                pageTitleLower.includes("security checkpoint") ||
                                pageUrl.includes("challenges.cloudflare.com") ||
                                pageUrl.includes("challenge-platform");

    if (isVercelCheckpoint) {
      safeLog(`⚠️ Detected Vercel/Security Checkpoint, attempting to bypass...`);

      try {
        await page.evaluate(() => {
          window.scrollTo(0, 100);
          setTimeout(() => window.scrollTo(0, 0), 500);
        });
      } catch {
        // Ignore scroll errors
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const checkAfterWait = await page.evaluate(() => {
        const title = document.title.toLowerCase();
        const url = window.location.href.toLowerCase();
        const bodyText = document.body.innerText.toLowerCase();

        return {
          isStillBlocked:
            title.includes("vercel security checkpoint") ||
            title.includes("security checkpoint") ||
            url.includes("challenges.cloudflare.com") ||
            url.includes("challenge-platform") ||
            bodyText.includes("checking your browser") ||
            bodyText.includes("just a moment"),
          hasContent: document.body.children.length > 1
        };
      });

      if (checkAfterWait.isStillBlocked) {
        safeLog(`❌ Still blocked by security checkpoint after initial wait`, true);
        const finalTitle = await page.title().catch(() => "unknown");
        const finalUrl = page.url();
        safeLog(`❌ Final URL: ${finalUrl}, Title: ${finalTitle}`, true);
        throw new Error(ERROR_CODES.VERCEL_SECURITY_CHECKPOINT);
      }

      const finalTitle = await page.title().catch(() => "unknown");
      const finalUrl = page.url();
      safeLog(`✅ Security checkpoint bypassed - Final URL: ${finalUrl}, Title: ${finalTitle}`);
    }

    const cloudflareResult = await waitForCloudflareChallenge(page, safeLog);
    if (cloudflareResult.hadChallenge) {
      if (cloudflareResult.stillBlocked) {
        const hasCaptcha = await detectCaptcha(page);
        if (hasCaptcha) {
          safeLog("❌ CAPTCHA detected and cannot be solved automatically", true);
          throw new Error(ERROR_CODES.CLOUDFLARE_PROTECTION);
        }

        safeLog("Waiting extra time after Cloudflare challenge...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        await page.evaluate(() => {
          window.scrollTo(0, 100);
          setTimeout(() => window.scrollTo(0, 0), 500);
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const stillCloudflare = await page.evaluate(() => {
          const bodyText = document.body.innerText.toLowerCase();
          const url = window.location.href.toLowerCase();
          return (
            bodyText.includes("cloudflare") ||
            bodyText.includes("checking your browser") ||
            url.includes("challenges.cloudflare.com")
          );
        });

        if (stillCloudflare) {
          throw new Error(ERROR_CODES.CLOUDFLARE_PROTECTION);
        }
      } else {
        safeLog("✅ Cloudflare challenge resolved");
      }
    }

    safeLog(`🍪 Handling cookie popups...`);
    await handleCookiePopups(page);
    safeLog(`🔒 Waiting for security checks...`);
    await waitForSecurityCheck(page);
    safeLog(`⏳ Waiting for loaders to disappear...`);
    await waitForLoadersToDisappear(page, safeLog);
    safeLog(`🎬 Waiting for animations and GSAP...`);
    await waitForAnimationsAndGSAP(page);
    safeLog(`⏳ Waiting 3 seconds before screenshot...`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    safeLog(`📜 Scrolling and waiting for images...`);
    try {
      await scrollAndWaitForImages(page);
      safeLog(`✅ Scrolling completed`);
    } catch (scrollError) {
      safeLog(`⚠️ Scrolling error (continuing anyway): ${scrollError.message}`);
    }

    safeLog(`⏳ Waiting 3 seconds after scroll for content to stabilize...`);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    safeLog(`✅ All pre-screenshot steps completed`);

    safeLog(`🎚 Freezing animations before screenshot...`);
    try {
      await page.evaluate(() => {
        try {
          const style = document.createElement("style");
          style.innerHTML =
            "*{animation:none !important;transition:none !important;scroll-behavior:auto !important;}";
          document.head.appendChild(style);
        } catch {}

        try {
          const gsap = window["gsap"];
          if (gsap && gsap.globalTimeline) {
            try {
              gsap.globalTimeline.pause();
            } catch {}
          }
        } catch {}

        try {
          const ScrollTrigger = window["ScrollTrigger"];
          if (ScrollTrigger && ScrollTrigger.getAll) {
            try {
              ScrollTrigger.getAll().forEach((trigger) => {
                try {
                  trigger.disable();
                } catch {}
              });
            } catch {}
          }
        } catch {}
      });
      safeLog(`✅ Animations frozen`);
    } catch {
      safeLog(`⚠️ Failed to freeze animations (continuing anyway)`);
    }

    safeLog(`🔍 Evaluating page state...`);
    let pageState;
    try {
      pageState = await Promise.race([
        page.evaluate(() => {
          return {
            readyState: document.readyState,
            bodyExists: !!document.body,
            bodyHeight: document.body ? document.body.scrollHeight : 0,
            bodyWidth: document.body ? document.body.scrollWidth : 0,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
          };
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Page evaluation timeout after 10s")), 10000)
        )
      ]);
      safeLog(`✅ Page state evaluation successful`);
    } catch (evalError) {
      safeLog(`❌ Page state evaluation failed: ${evalError.message}`, true);
      safeLog(`❌ Evaluation error stack: ${evalError.stack}`, true);
      pageState = { readyState: "unknown", bodyExists: false };
    }
    safeLog(`📊 Page state before screenshot: ${JSON.stringify(pageState)}`);

    safeLog(`🔍 Checking if page is still open...`);
    const isClosed = page.isClosed();
    safeLog(`📄 Page closed status: ${isClosed}`);

    if (isClosed) {
      throw new Error("Page was closed before screenshot could be taken");
    }

    let screenshot = "";

    if (!pageState.bodyExists) {
      safeLog(`⚠️ Page body does not exist, skipping screenshot`, true);
    } else {
      safeLog(`📸 Taking full page screenshot...`);
      try {
        const screenshotBuffer = await Promise.race([
          page.screenshot({
            fullPage: true,
            encoding: "binary",
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Screenshot timeout after 30s")), 30000)
          )
        ]);

        if (screenshotBuffer) {
          const bufferSize = Buffer.isBuffer(screenshotBuffer)
            ? screenshotBuffer.length
            : screenshotBuffer.byteLength || 0;
          safeLog(`✅ Screenshot captured, size: ${bufferSize} bytes`);

          if (bufferSize >= 100) {
            const metadata = await sharp(screenshotBuffer).metadata();

            if (metadata && metadata.width && metadata.height) {
              const maxDimension = 8000;
              const needsResize = metadata.width > maxDimension || metadata.height > maxDimension;

              let processedBuffer;
              if (needsResize) {
                const aspectRatio = metadata.width / metadata.height;
                let newWidth = Math.min(metadata.width, maxDimension);
                let newHeight = Math.round(newWidth / aspectRatio);
                if (newHeight > maxDimension) {
                  newHeight = maxDimension;
                  newWidth = Math.round(maxDimension * aspectRatio);
                }
                processedBuffer = await sharp(screenshotBuffer)
                  .resize(newWidth, newHeight, { fit: "inside", withoutEnlargement: true })
                  .jpeg({ quality: 85 })
                  .toBuffer();
              } else {
                processedBuffer = await sharp(screenshotBuffer).jpeg({ quality: 85 }).toBuffer();
              }

              screenshot = screenshotResultToBase64(processedBuffer);
              safeLog(`✅ Screenshot processed, base64 length: ${screenshot.length}`);
            }
          }
        }
      } catch (screenshotError) {
        safeLog(`⚠️ Screenshot failed (continuing without it): ${screenshotError.message}`, true);
      }
    }

    const html = await page.content();

    const title = await page.title();
    const description = await page
      .$eval('meta[name="description"]', (el) => el.getAttribute("content"))
      .catch(() => null);

    const markdown = htmlToMarkdown(html);
    const simplifiedHTML = extractSimplifiedHTML(html);
    const images = extractImages(html, url);
    const videos = extractVideos(html, url);
    const designMetadata = await extractAdvancedDesignMetadata(page);

    await saveSession(page, url);
    safeLog("✅ Session data saved");

    safeLog("Simple scraping successful");

    return {
      html,
      markdown,
      simplifiedHTML,
      title,
      description,
      url,
      screenshot,
      images,
      videos,
      designMetadata,
    };
  } catch (error) {
    safeLog(`❌ Scraping error for ${url}: ${error.message}`, true);
    safeLog(`❌ Error stack: ${error.stack}`, true);
    throw error;
  } finally {
    if (browser) {
      safeLog(`🔒 Closing browser...`);
      await browser.close().catch((closeErr) => {
        safeLog(`⚠️ Error closing browser: ${closeErr.message}`);
      });
    }
  }
}