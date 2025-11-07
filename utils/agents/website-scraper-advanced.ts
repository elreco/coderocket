"use server";

import chromium from "@sparticuz/chromium";
import * as cheerio from "cheerio";
import puppeteer, { Browser, Page } from "puppeteer-core";

interface WebsiteContent {
  html: string;
  markdown?: string;
  title: string;
  description: string | null;
  url: string;
  screenshot?: string;
  metaTags?: Record<string, string>;
  links?: string[];
  extractedData?: {
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
      accentColors?: string[];
      backgroundColor?: string;
      textColor?: string;
      allColors?: string[];
      computedStyles?: ComputedStyles;
      gradients?: string[];
      backgroundImages?: string[];
      boxShadows?: string[];
    };
    typography?: {
      headingFonts?: string[];
      bodyFonts?: string[];
      fontSize?: string;
      fontWeights?: string[];
      letterSpacing?: string[];
    };
    layout?: {
      type?: string;
      hasHero?: boolean;
      hasNavbar?: boolean;
      hasFooter?: boolean;
      hasSidebar?: boolean;
      maxWidth?: string;
      structure?: LayoutStructure[];
      spacing?: SpacingDetails;
    };
    designElements?: {
      borderRadius?: string;
      shadows?: boolean;
      spacing?: string;
      css?: string;
      animations?: string[];
      transitions?: string[];
    };
    components?: {
      buttonStyle?: string;
      cardStyle?: string;
      navigationStyle?: string;
      detected?: Record<string, unknown>;
      media?: {
        logos: MediaAsset[];
        images: MediaAsset[];
        videos: MediaAsset[];
      };
    };
  };
}

interface LayoutStructure {
  tag: string;
  classes: string;
  id?: string;
  role?: string;
  styles: {
    display?: string;
    position?: string;
    width?: string;
    height?: string;
    maxWidth?: string;
    margin?: string;
    padding?: string;
    backgroundColor?: string;
    gap?: string;
    gridTemplateColumns?: string;
    flexDirection?: string;
    justifyContent?: string;
    alignItems?: string;
  };
  textContent?: string;
  children?: number;
}

interface SpacingDetails {
  containerMaxWidths: string[];
  commonPaddings: string[];
  commonMargins: string[];
  commonGaps: string[];
}

const isDev = process.env.NODE_ENV === "development";

async function getBrowser(): Promise<Browser> {
  const commonArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-features=IsolateOrigins,site-per-process",
    "--disable-web-security",
    "--disable-features=VizDisplayCompositor",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--no-first-run",
    "--no-zygote",
    "--disable-gpu",
  ];

  if (isDev) {
    try {
      const puppeteerExtra = await import("puppeteer-extra");
      const StealthPlugin = await import("puppeteer-extra-plugin-stealth");
      const puppeteerModule = await import("puppeteer");

      puppeteerExtra.default.use(StealthPlugin.default());

      return (await puppeteerExtra.default.launch({
        executablePath: puppeteerModule.default.executablePath(),
        headless: true,
        args: commonArgs,
      })) as unknown as Browser;
    } catch {
      console.log("Stealth plugin not available, using standard puppeteer");
      const puppeteerModule = await import("puppeteer");
      return await puppeteerModule.default.launch({
        headless: true,
        args: commonArgs,
      });
    }
  } else {
    return await puppeteer.launch({
      args: [...chromium.args, ...commonArgs],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
}

interface ExtractedColors {
  primaryColor?: string;
  secondaryColor?: string;
  accentColors: string[];
  backgroundColor?: string;
  textColor?: string;
  allColors: string[];
}

function extractColors(html: string): ExtractedColors {
  const $ = cheerio.load(html);
  const colors = new Set<string>();
  const colorCounts = new Map<string, number>();

  $("*").each((_, element) => {
    const style = $(element).attr("style");
    if (style) {
      const colorMatch = style.match(
        /(?:color|background-color|background|border-color):\s*([^;]+)/gi,
      );
      if (colorMatch) {
        colorMatch.forEach((match) => {
          const color = match.split(":")[1]?.trim();
          if (color && !color.includes("transparent") && color !== "inherit") {
            colors.add(color);
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
          }
        });
      }
    }

    ["class", "className"].forEach((attr) => {
      const classes = $(element).attr(attr);
      if (classes) {
        const bgMatch = classes.match(/bg-[\w-]+/g);
        const textMatch = classes.match(/text-[\w-]+/g);
        bgMatch?.forEach((c) => {
          colors.add(c);
          colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
        });
        textMatch?.forEach((c) => {
          colors.add(c);
          colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
        });
      }
    });
  });

  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  return {
    backgroundColor: sortedColors[0],
    primaryColor: sortedColors[1],
    secondaryColor: sortedColors[2],
    textColor: sortedColors[3],
    accentColors: sortedColors.slice(4, 8),
    allColors: sortedColors.slice(0, 20),
  };
}

function extractFonts(html: string): {
  headingFonts: string[];
  bodyFonts: string[];
} {
  const $ = cheerio.load(html);
  const fonts = new Set<string>();

  $("link[href*='fonts.googleapis.com']").each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      const fontMatch = href.match(/family=([^&:]+)/);
      if (fontMatch) {
        fonts.add(fontMatch[1].replace(/\+/g, " "));
      }
    }
  });

  $("*").each((_, element) => {
    const style = $(element).attr("style");
    if (style) {
      const fontMatch = style.match(/font-family:\s*([^;]+)/i);
      if (fontMatch) {
        const fontFamily = fontMatch[1]
          .split(",")[0]
          ?.replace(/['"]/g, "")
          .trim();
        if (fontFamily) {
          fonts.add(fontFamily);
        }
      }
    }
  });

  const fontArray = Array.from(fonts);
  return {
    headingFonts: fontArray.slice(0, 2),
    bodyFonts: fontArray.slice(0, 3),
  };
}

function analyzeLayout(html: string): {
  type: string;
  hasHero: boolean;
  hasNavbar: boolean;
  hasFooter: boolean;
  hasSidebar: boolean;
  maxWidth?: string;
} {
  const $ = cheerio.load(html);

  const hasHero =
    $("header, .hero, [class*='hero'], section:first-of-type").length > 0;
  const hasNavbar =
    $(
      "nav, .navbar, .navigation, [class*='nav'], [role='navigation'], header nav",
    ).length > 0;
  const hasFooter = $("footer, .footer, [class*='footer']").length > 0;
  const hasSidebar =
    $(".sidebar, [class*='sidebar'], aside, [role='complementary']").length > 0;

  let layoutType = "standard";
  if (hasSidebar) layoutType = "sidebar";
  if ($(".container-fluid, [class*='full-width']").length > 0)
    layoutType = "full-width";

  return {
    type: layoutType,
    hasHero,
    hasNavbar,
    hasFooter,
    hasSidebar,
    maxWidth: "1280px",
  };
}

function extractGradients(html: string): string[] {
  const $ = cheerio.load(html);
  const gradients = new Set<string>();

  $("*").each((_, element) => {
    const style = $(element).attr("style");
    if (style) {
      const gradientMatch = style.match(
        /(?:linear-gradient|radial-gradient|conic-gradient)\([^)]+\)/gi,
      );
      if (gradientMatch) {
        gradientMatch.forEach((gradient) => gradients.add(gradient));
      }
    }
  });

  return Array.from(gradients).slice(0, 10);
}

interface MediaAsset {
  type: "image" | "video" | "logo";
  src: string;
  alt?: string;
  width?: string;
  height?: string;
  format?: string;
  isLogo?: boolean;
  videoType?: "youtube" | "vimeo" | "native" | "other";
  thumbnail?: string;
}

function analyzeComponents(
  html: string,
  baseUrl: string,
): {
  buttons: { count: number; styles: string[] };
  cards: { count: number; styles: string[] };
  forms: { count: number; types: string[] };
  images: { count: number; sources: string[] };
  media: {
    logos: MediaAsset[];
    images: MediaAsset[];
    videos: MediaAsset[];
  };
} {
  const $ = cheerio.load(html);

  const buttons = new Set<string>();
  $("button, [role='button'], a.btn, a.button, input[type='submit']").each(
    (_, el) => {
      const classes = $(el).attr("class") || "";
      buttons.add(classes);
    },
  );

  const cards = new Set<string>();
  $(".card, [class*='card'], article, .item, [class*='item']").each((_, el) => {
    const classes = $(el).attr("class") || "";
    if (classes) cards.add(classes);
  });

  const formTypes = new Set<string>();
  $("form, [role='form']").each((_, el) => {
    const inputs = $(el).find("input, select, textarea");
    inputs.each((_, input) => {
      const type = $(input).attr("type") || $(input).prop("tagName");
      if (type) formTypes.add(type.toLowerCase());
    });
  });

  const makeAbsoluteUrl = (url: string): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) {
      try {
        const base = new URL(baseUrl);
        return `${base.protocol}//${base.host}${url}`;
      } catch {
        return url;
      }
    }
    return url;
  };

  const logos: MediaAsset[] = [];
  const images: MediaAsset[] = [];
  const videos: MediaAsset[] = [];

  const logoSelectors = [
    "img[class*='logo']",
    "img[id*='logo']",
    "img[alt*='logo' i]",
    "img[alt*='brand' i]",
    ".logo img",
    "#logo img",
    "header img:first-of-type",
    "nav img:first-of-type",
    "[class*='brand'] img",
    "[class*='header'] img:first-of-type",
  ];

  const detectedLogos = new Set<string>();
  logoSelectors.forEach((selector) => {
    $(selector).each((_, el) => {
      const src = $(el).attr("src");
      if (src && !src.includes("data:image") && !detectedLogos.has(src)) {
        detectedLogos.add(src);
        logos.push({
          type: "logo",
          src: makeAbsoluteUrl(src),
          alt: $(el).attr("alt") || "Logo",
          width: $(el).attr("width"),
          height: $(el).attr("height"),
          isLogo: true,
        });
      }
    });
  });

  const allImageSources = new Set<string>();
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (
      src &&
      !src.includes("data:image") &&
      !detectedLogos.has(src) &&
      !allImageSources.has(src)
    ) {
      allImageSources.add(src);
      const absoluteSrc = makeAbsoluteUrl(src);
      images.push({
        type: "image",
        src: absoluteSrc,
        alt: $(el).attr("alt") || "",
        width: $(el).attr("width"),
        height: $(el).attr("height"),
        format: absoluteSrc.split(".").pop()?.split("?")[0],
      });
    }
  });

  $("video source, video").each((_, el) => {
    const src = $(el).attr("src");
    if (src) {
      videos.push({
        type: "video",
        src: makeAbsoluteUrl(src),
        videoType: "native",
        format: src.split(".").pop()?.split("?")[0],
      });
    }
  });

  $("iframe").each((_, el) => {
    const src = $(el).attr("src");
    if (src) {
      let videoType: "youtube" | "vimeo" | "other" = "other";
      if (src.includes("youtube.com") || src.includes("youtu.be")) {
        videoType = "youtube";
        const videoId = src.match(
          /(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/,
        )?.[1];
        videos.push({
          type: "video",
          src: src,
          videoType,
          thumbnail: videoId
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : undefined,
        });
      } else if (src.includes("vimeo.com")) {
        videoType = "vimeo";
        videos.push({
          type: "video",
          src: src,
          videoType,
        });
      } else if (
        src.includes("video") ||
        src.includes("embed") ||
        src.includes("player")
      ) {
        videos.push({
          type: "video",
          src: src,
          videoType: "other",
        });
      }
    }
  });

  return {
    buttons: {
      count: $("button, [role='button'], a.btn, a.button").length,
      styles: Array.from(buttons).slice(0, 5),
    },
    cards: {
      count: $(".card, [class*='card'], article").length,
      styles: Array.from(cards).slice(0, 5),
    },
    forms: {
      count: $("form, [role='form']").length,
      types: Array.from(formTypes),
    },
    images: {
      count: images.length,
      sources: images.slice(0, 20).map((img) => img.src),
    },
    media: {
      logos: logos.slice(0, 10),
      images: images.slice(0, 100),
      videos: videos.slice(0, 20),
    },
  };
}

function createStructuredDescription(
  html: string,
  title: string,
  colors: ExtractedColors,
  fonts: { headingFonts: string[]; bodyFonts: string[] },
  layout: {
    type: string;
    hasHero: boolean;
    hasNavbar: boolean;
    hasFooter: boolean;
    hasSidebar: boolean;
    maxWidth?: string;
  },
  components: {
    buttons: { count: number; styles: string[] };
    cards: { count: number; styles: string[] };
    forms: { count: number; types: string[] };
    images: { count: number; sources: string[] };
    media: {
      logos: MediaAsset[];
      images: MediaAsset[];
      videos: MediaAsset[];
    };
  },
  layoutStructure: LayoutStructure[],
  gradients: string[],
  spacingDetails: SpacingDetails,
  computedStyles: ComputedStyles,
  allCSS: string,
  backgroundsAndShadows: { backgroundImages: string[]; boxShadows: string[] },
): string {
  const $ = cheerio.load(html);

  let description = `# Complete Website Clone Instructions: ${title}\n\n`;

  description += `## CRITICAL: Layout & Structure Fidelity\n`;
  description += `This website must be cloned with EXACT precision. Every spacing, color, font, image, and layout detail must match the original perfectly.\n\n`;

  description += `## Quick Summary\n`;
  description += `- Layout Type: ${layout.type}\n`;
  description += `- Main Sections: ${layout.hasNavbar ? "Navigation, " : ""}${layout.hasHero ? "Hero, " : ""}Content${layout.hasFooter ? ", Footer" : ""}\n`;
  description += `- Total Images: ${components.media.images.length}\n`;
  description += `- Total Logos: ${components.media.logos.length}\n`;
  description += `- Total Videos: ${components.media.videos.length}\n`;
  description += `- Buttons: ${components.buttons.count}\n`;
  description += `- Forms: ${components.forms.count}\n`;
  description += `- Color Scheme: ${colors.allColors.length} unique colors detected\n`;
  description += `- Primary Font: ${fonts.headingFonts[0] || "System default"}\n\n`;

  description += `## Full Page Structure\n`;
  description += `### HTML Structure Overview\n`;
  layoutStructure.forEach((struct, idx) => {
    description += `\n${idx + 1}. <${struct.tag}> Element:\n`;
    if (struct.classes) description += `   - Classes: ${struct.classes}\n`;
    if (struct.id) description += `   - ID: ${struct.id}\n`;
    if (struct.role) description += `   - Role: ${struct.role}\n`;
    description += `   - Display: ${struct.styles.display || "block"}\n`;
    if (struct.styles.position)
      description += `   - Position: ${struct.styles.position}\n`;
    if (struct.styles.width)
      description += `   - Width: ${struct.styles.width}\n`;
    if (struct.styles.maxWidth)
      description += `   - Max-Width: ${struct.styles.maxWidth}\n`;
    if (struct.styles.padding)
      description += `   - Padding: ${struct.styles.padding}\n`;
    if (struct.styles.margin)
      description += `   - Margin: ${struct.styles.margin}\n`;
    if (struct.styles.backgroundColor)
      description += `   - Background: ${struct.styles.backgroundColor}\n`;
    if (struct.styles.gap) description += `   - Gap: ${struct.styles.gap}\n`;
    if (struct.styles.gridTemplateColumns)
      description += `   - Grid: ${struct.styles.gridTemplateColumns}\n`;
    if (struct.styles.flexDirection)
      description += `   - Flex Direction: ${struct.styles.flexDirection}\n`;
    if (struct.styles.justifyContent)
      description += `   - Justify: ${struct.styles.justifyContent}\n`;
    if (struct.styles.alignItems)
      description += `   - Align: ${struct.styles.alignItems}\n`;
    if (struct.textContent && struct.textContent.length < 100) {
      description += `   - Text: "${struct.textContent}"\n`;
    }
    if (struct.children)
      description += `   - Children: ${struct.children} elements\n`;
  });
  description += `\n`;

  description += `## Spacing System\n`;
  description += `### Container Widths:\n`;
  spacingDetails.containerMaxWidths.forEach((w) => {
    description += `- ${w}\n`;
  });
  description += `\n### Common Paddings:\n`;
  spacingDetails.commonPaddings.forEach((p) => {
    description += `- ${p}\n`;
  });
  description += `\n### Common Margins:\n`;
  spacingDetails.commonMargins.forEach((m) => {
    description += `- ${m}\n`;
  });
  description += `\n### Common Gaps:\n`;
  spacingDetails.commonGaps.forEach((g) => {
    description += `- ${g}\n`;
  });
  description += `\n`;

  description += `## Visual Design System\n`;
  description += `### Colors (EXACT):\n`;
  description += `- Primary: ${colors.primaryColor || "not detected"}\n`;
  description += `- Secondary: ${colors.secondaryColor || "not detected"}\n`;
  description += `- Background: ${colors.backgroundColor || "not detected"}\n`;
  description += `- Text: ${colors.textColor || "not detected"}\n`;
  description += `- Accents: ${colors.accentColors.join(", ") || "none"}\n`;
  description += `- All Colors Used: ${colors.allColors.join(", ")}\n\n`;

  if (gradients.length > 0) {
    description += `### Gradients:\n`;
    gradients.forEach((grad) => {
      description += `- ${grad}\n`;
    });
    description += `\n`;
  }

  if (backgroundsAndShadows.backgroundImages.length > 0) {
    description += `### Background Images:\n`;
    backgroundsAndShadows.backgroundImages.forEach((bg) => {
      description += `- ${bg}\n`;
    });
    description += `\n`;
  }

  if (backgroundsAndShadows.boxShadows.length > 0) {
    description += `### Box Shadows:\n`;
    backgroundsAndShadows.boxShadows.forEach((shadow) => {
      description += `- ${shadow}\n`;
    });
    description += `\n`;
  }

  description += `## Typography System\n`;
  description += `### Fonts:\n`;
  description += `- Headings: ${fonts.headingFonts.join(", ") || "system default"}\n`;
  description += `- Body: ${fonts.bodyFonts.join(", ") || "system default"}\n\n`;

  description += `### Body Text Styles:\n`;
  description += `- Font Family: ${computedStyles.body.fontFamily}\n`;
  description += `- Font Size: ${computedStyles.body.fontSize}\n`;
  description += `- Line Height: ${computedStyles.body.lineHeight}\n`;
  description += `- Color: ${computedStyles.body.color}\n\n`;

  description += `### Heading Styles:\n`;
  computedStyles.headings.forEach((h) => {
    description += `#### ${h.tag?.toUpperCase()}:\n`;
    description += `- Font: ${h.fontFamily}\n`;
    description += `- Size: ${h.fontSize}\n`;
    description += `- Weight: ${h.fontWeight}\n`;
    description += `- Color: ${h.color}\n`;
    description += `- Line Height: ${h.lineHeight}\n\n`;
  });

  description += `### Link Styles:\n`;
  if (computedStyles.links[0]) {
    description += `- Color: ${computedStyles.links[0].color}\n`;
    description += `- Decoration: ${computedStyles.links[0].textDecoration}\n\n`;
  }

  description += `## Button Styles\n`;
  computedStyles.buttons.forEach((btn, idx) => {
    description += `### Button ${idx + 1}:\n`;
    description += `- Background: ${btn.backgroundColor}\n`;
    description += `- Color: ${btn.color}\n`;
    description += `- Border Radius: ${btn.borderRadius}\n`;
    description += `- Padding: ${btn.padding}\n`;
    description += `- Font Size: ${btn.fontSize}\n`;
    description += `- Font Weight: ${btn.fontWeight}\n\n`;
  });

  description += `## Layout Components\n`;
  description += `- Type: ${layout.type}\n`;
  description += `- Has Hero Section: ${layout.hasHero ? "YES - Must include prominent hero section at top" : "No"}\n`;
  description += `- Has Navigation: ${layout.hasNavbar ? "YES - Must include navigation bar" : "No"}\n`;
  description += `- Has Footer: ${layout.hasFooter ? "YES - Must include footer section" : "No"}\n`;
  description += `- Has Sidebar: ${layout.hasSidebar ? "YES - Must include sidebar" : "No"}\n`;
  description += `- Max Width: ${layout.maxWidth}\n\n`;

  description += `## Component Counts\n`;
  description += `- Buttons: ${components.buttons.count}\n`;
  description += `- Cards: ${components.cards.count}\n`;
  description += `- Forms: ${components.forms.count}\n`;
  description += `- Images: ${components.images.count}\n\n`;

  if (components.media.logos.length > 0) {
    description += `## LOGOS (MUST INCLUDE):\n`;
    components.media.logos.forEach((logo, idx) => {
      description += `\n### Logo ${idx + 1}:\n`;
      description += `- URL: ${logo.src}\n`;
      description += `- Alt Text: ${logo.alt || "Logo"}\n`;
      if (logo.width) description += `- Width: ${logo.width}\n`;
      if (logo.height) description += `- Height: ${logo.height}\n`;
      description += `- Usage: This logo should be prominently displayed, typically in the header/navigation area\n`;
    });
    description += `\n`;
  }

  if (components.media.videos.length > 0) {
    description += `## VIDEOS:\n`;
    components.media.videos.forEach((video, idx) => {
      description += `\n### Video ${idx + 1}:\n`;
      description += `- Type: ${video.videoType?.toUpperCase() || "VIDEO"}\n`;
      description += `- URL: ${video.src}\n`;
      if (video.thumbnail) {
        description += `- Thumbnail: ${video.thumbnail}\n`;
      }
      description += `- Implementation: Use appropriate embed or video player\n`;
    });
    description += `\n`;
  }

  if (components.media.images.length > 0) {
    description += `## IMAGES (ALL MUST BE INCLUDED):\n`;
    description += `Total Images: ${components.media.images.length}\n\n`;
    description += `CRITICAL: Every single image listed below MUST be included in the final component with the exact URLs provided.\n\n`;
    components.media.images.forEach((img, idx) => {
      description += `### Image ${idx + 1}:\n`;
      description += `- URL: ${img.src}\n`;
      if (img.alt) description += `- Alt Text: ${img.alt}\n`;
      if (img.width) description += `- Width: ${img.width}\n`;
      if (img.height) description += `- Height: ${img.height}\n`;
      if (img.format) description += `- Format: ${img.format}\n`;
      description += `\n`;
    });
  }

  description += `## Content Hierarchy\n`;
  description += `### Main Headings (H1):\n`;
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) description += `- "${text}"\n`;
  });
  description += `\n`;

  description += `### Section Headings (H2):\n`;
  $("h2").each((i, el) => {
    if (i < 15) {
      const text = $(el).text().trim();
      if (text) description += `- "${text}"\n`;
    }
  });
  description += `\n`;

  description += `### Subsection Headings (H3):\n`;
  $("h3").each((i, el) => {
    if (i < 15) {
      const text = $(el).text().trim();
      if (text) description += `- "${text}"\n`;
    }
  });
  description += `\n`;

  description += `## Key Content Paragraphs\n`;
  let paragraphCount = 0;
  $("p").each((i, el) => {
    if (paragraphCount >= 50) return;
    const text = $(el).text().trim();
    if (text && text.length > 20 && text.length < 300) {
      description += `${paragraphCount + 1}. "${text}"\n\n`;
      paragraphCount++;
    }
  });

  description += `## Button & Link Texts\n`;
  let buttonCount = 0;
  $("button, a.btn, a.button, [role='button']").each((i, el) => {
    if (buttonCount >= 50) return;
    const text = $(el).text().trim();
    if (text && text.length < 100) {
      description += `- "${text}"\n`;
      buttonCount++;
    }
  });
  description += `\n`;

  const lists = $("ul, ol");
  if (lists.length > 0) {
    description += `## Lists & Navigation Items\n`;
    description += `Total Lists: ${lists.length}\n\n`;
    lists.slice(0, 10).each((idx, list) => {
      const items: string[] = [];
      $(list)
        .find("li")
        .slice(0, 15)
        .each((i, li) => {
          const text = $(li).text().trim();
          if (text && text.length < 100) {
            items.push(text);
          }
        });
      if (items.length > 0) {
        description += `### List ${idx + 1} (${$(list).prop("tagName")}):\n`;
        items.forEach((item) => {
          description += `- ${item}\n`;
        });
        description += `\n`;
      }
    });
  }

  const tables = $("table");
  if (tables.length > 0) {
    description += `## Tables\n`;
    description += `Total Tables: ${tables.length}\n`;
    description += `Note: The website contains ${tables.length} table(s). Include these with proper styling.\n\n`;
  }

  description += `## CSS Styles (Extracted)\n`;
  description += `### Key CSS Rules (Use as reference for precise styling):\n`;
  description += `\`\`\`css\n${allCSS.substring(0, 30000)}\n\`\`\`\n\n`;

  description += `## IMPLEMENTATION REQUIREMENTS (MUST FOLLOW):\n\n`;
  description += `### Color System:\n`;
  description += `- Use EXACTLY the colors listed in the Visual Design System section\n`;
  description += `- Apply the correct color to each element type (backgrounds, text, accents)\n`;
  description += `- Include all gradients specified\n`;
  description += `- Match box shadows precisely\n\n`;

  description += `### Typography:\n`;
  description += `- Import the EXACT fonts specified (use Google Fonts or similar)\n`;
  description += `- Apply heading styles with correct sizes, weights, and line heights\n`;
  description += `- Use body text styles as specified\n`;
  description += `- Maintain proper text hierarchy\n\n`;

  description += `### Layout & Structure:\n`;
  description += `- Follow the HTML Structure Overview section precisely\n`;
  description += `- Use the exact display properties (flex, grid, block) as specified\n`;
  description += `- Apply all padding, margin, and gap values from the Spacing System\n`;
  description += `- Respect max-width constraints for containers\n`;
  description += `- Include all structural elements (header, nav, main, footer, sections)\n\n`;

  description += `### Images & Media:\n`;
  description += `- Include EVERY SINGLE logo listed with exact URLs\n`;
  description += `- Include EVERY SINGLE image listed with exact URLs\n`;
  description += `- Use proper alt text for accessibility\n`;
  description += `- Maintain aspect ratios and sizes where specified\n`;
  description += `- Include all videos with proper embeds\n`;
  description += `- Apply background images where specified\n\n`;

  description += `### Components:\n`;
  description += `- Replicate button styles exactly (colors, padding, border-radius, fonts)\n`;
  description += `- Include all button and link texts as listed\n`;
  description += `- Recreate cards and other components with proper styling\n`;
  description += `- Include all lists and navigation items\n`;
  description += `- Add tables if present\n\n`;

  description += `### Content:\n`;
  description += `- Include ALL headings (H1, H2, H3) with exact text\n`;
  description += `- Include ALL key paragraphs with exact text\n`;
  description += `- Include all button and link texts\n`;
  description += `- Maintain content hierarchy and flow\n\n`;

  description += `### Styling Details:\n`;
  description += `- Reference the extracted CSS for precise styling rules\n`;
  description += `- Apply animations and transitions as specified\n`;
  description += `- Use proper border-radius values\n`;
  description += `- Apply box-shadows correctly\n`;
  description += `- Ensure hover states work properly\n\n`;

  description += `### Final Checks:\n`;
  description += `- The final component should be visually INDISTINGUISHABLE from the original\n`;
  description += `- Every color, font, spacing, image, and text should match exactly\n`;
  description += `- Test responsive design at different screen sizes\n`;
  description += `- Verify all images load correctly\n`;
  description += `- Check that all links and buttons are properly styled\n\n`;

  description += `### Critical Notes:\n`;
  description += `- This is not a "close approximation" - it must be EXACT\n`;
  description += `- Do not skip any images, logos, or content sections\n`;
  description += `- Do not simplify the layout or structure\n`;
  description += `- Do not change colors or fonts to "similar" ones - use the EXACT values\n`;
  description += `- Quality over speed - take time to match everything precisely\n`;

  return description;
}

interface ComputedStyles {
  body: {
    backgroundColor?: string;
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
  };
  buttons: Array<{
    backgroundColor?: string;
    color?: string;
    borderRadius?: string;
    padding?: string;
    fontSize?: string;
    fontWeight?: string;
  }>;
  headings: Array<{
    tag?: string;
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    lineHeight?: string;
  }>;
  links: Array<{
    color?: string;
    textDecoration?: string;
  }>;
}

async function handleCookiePopups(page: Page): Promise<void> {
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
      '[id*="cookieAccept"]',
      '[class*="cookieAccept"]',
      ".cookie-accept",
      "#cookie-accept",
      'button[aria-label*="accept"]',
      'button[aria-label*="cookie"]',
    ];

    for (const selector of cookieSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          console.log(`Closed cookie popup with selector: ${selector}`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          break;
        }
      } catch {
        continue;
      }
    }
  } catch {
    console.log("No cookie popup found or failed to close");
  }
}

async function waitForLoadersToDisappear(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const checkLoaders = () => {
          const loaders = document.querySelectorAll(
            '[class*="loader"], [class*="loading"], [class*="spinner"], [id*="loader"], [id*="loading"]',
          );

          const visibleLoaders = Array.from(loaders).filter((el) => {
            const style = window.getComputedStyle(el as Element);
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.opacity !== "0"
            );
          });

          if (visibleLoaders.length === 0) {
            resolve(true);
          } else {
            setTimeout(checkLoaders, 500);
          }
        };

        checkLoaders();
        setTimeout(() => resolve(true), 5000);
      });
    });
    console.log("Loaders disappeared or timed out");
  } catch {
    console.log("Error waiting for loaders");
  }
}

async function waitForCloudflareChallenge(page: Page): Promise<boolean> {
  try {
    const isCloudflareChallenge = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      const title = document.title.toLowerCase();

      return (
        bodyText.includes("checking your browser") ||
        bodyText.includes("cloudflare") ||
        bodyText.includes("just a moment") ||
        bodyText.includes("ddos protection") ||
        title.includes("just a moment") ||
        title.includes("cloudflare") ||
        document.querySelector("#challenge-running") !== null ||
        document.querySelector(".cf-browser-verification") !== null
      );
    });

    if (isCloudflareChallenge) {
      console.log("Cloudflare challenge detected, waiting for resolution...");

      await page
        .waitForFunction(
          () => {
            const bodyText = document.body.innerText.toLowerCase();
            const title = document.title.toLowerCase();

            return !(
              bodyText.includes("checking your browser") ||
              bodyText.includes("just a moment") ||
              title.includes("just a moment") ||
              document.querySelector("#challenge-running") !== null
            );
          },
          { timeout: 15000 },
        )
        .catch(() => {
          console.log("Cloudflare challenge timeout");
        });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log("Cloudflare challenge resolved or timed out");
      return true;
    }

    return false;
  } catch {
    console.log("Error checking for Cloudflare challenge");
    return false;
  }
}

export async function scrapeWebsiteAdvanced(
  url: string,
): Promise<WebsiteContent> {
  let browser: Browser | null = null;

  try {
    console.log(`Starting advanced scraping for: ${url}`);

    browser = await getBrowser();
    const page = await browser.newPage();

    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false,
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "max-age=0",
      "sec-ch-ua":
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });

      (window.navigator as unknown as { chrome: unknown }).chrome = {
        runtime: {},
      };

      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en", "fr"],
      });

      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (
        parameters: PermissionDescriptor,
      ) =>
        parameters.name === "notifications"
          ? Promise.resolve({
              state: Notification.permission,
            } as PermissionStatus)
          : originalQuery(parameters);
    });

    try {
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
    } catch {
      console.log("First attempt failed, trying with domcontentloaded");
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const hadCloudflare = await waitForCloudflareChallenge(page);

    if (hadCloudflare) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    await handleCookiePopups(page);

    await waitForLoadersToDisappear(page);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const screenshotBuffer = (await page.screenshot({
      fullPage: true,
      encoding: "binary",
    })) as Buffer;
    const screenshot = screenshotBuffer.toString("base64");

    const html = await page.content();

    const title = await page.title();
    const description = await page
      .$eval('meta[name="description"]', (el) => el.getAttribute("content"))
      .catch(() => null);

    const metaTags: Record<string, string> = await page.evaluate(() => {
      const tags: Record<string, string> = {};
      document.querySelectorAll("meta").forEach((meta) => {
        const name = meta.getAttribute("name") || meta.getAttribute("property");
        const content = meta.getAttribute("content");
        if (name && content) {
          tags[name] = content;
        }
      });
      return tags;
    });

    const links: string[] = await page.$$eval("a[href]", (anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).href),
    );

    const computedStyles: ComputedStyles = await page.evaluate(() => {
      const styles = {
        body: {},
        buttons: [] as Array<Record<string, string>>,
        headings: [] as Array<Record<string, string>>,
        links: [] as Array<Record<string, string>>,
      };

      const body = document.body;
      if (body) {
        const bodyStyles = window.getComputedStyle(body);
        styles.body = {
          backgroundColor: bodyStyles.backgroundColor,
          color: bodyStyles.color,
          fontFamily: bodyStyles.fontFamily,
          fontSize: bodyStyles.fontSize,
          lineHeight: bodyStyles.lineHeight,
        };
      }

      const buttons = document.querySelectorAll("button, [role='button']");
      buttons.forEach((btn, i) => {
        if (i < 3) {
          const btnStyles = window.getComputedStyle(btn as Element);
          styles.buttons.push({
            backgroundColor: btnStyles.backgroundColor,
            color: btnStyles.color,
            borderRadius: btnStyles.borderRadius,
            padding: btnStyles.padding,
            fontSize: btnStyles.fontSize,
            fontWeight: btnStyles.fontWeight,
          });
        }
      });

      const headings = document.querySelectorAll("h1, h2, h3");
      headings.forEach((h, i) => {
        if (i < 3) {
          const hStyles = window.getComputedStyle(h as Element);
          styles.headings.push({
            tag: h.tagName.toLowerCase(),
            color: hStyles.color,
            fontFamily: hStyles.fontFamily,
            fontSize: hStyles.fontSize,
            fontWeight: hStyles.fontWeight,
            lineHeight: hStyles.lineHeight,
          });
        }
      });

      const linksElements = document.querySelectorAll("a");
      linksElements.forEach((link, i) => {
        if (i < 3) {
          const linkStyles = window.getComputedStyle(link as Element);
          styles.links.push({
            color: linkStyles.color,
            textDecoration: linkStyles.textDecoration,
          });
        }
      });

      return styles;
    });

    const allCSS = await page.evaluate(() => {
      const cssTexts: string[] = [];
      const styleSheets = Array.from(document.styleSheets);

      styleSheets.forEach((sheet) => {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          const cssText = rules
            .map((rule) => rule.cssText)
            .join("\n")
            .substring(0, 100000);
          if (cssText) cssTexts.push(cssText);
        } catch {
          return;
        }
      });

      const inlineStyles = Array.from(document.querySelectorAll("style"));
      inlineStyles.forEach((style) => {
        if (style.textContent) {
          cssTexts.push(style.textContent.substring(0, 50000));
        }
      });

      return cssTexts.join("\n\n").substring(0, 100000);
    });

    const layoutStructure: LayoutStructure[] = await page.evaluate(() => {
      const structures: LayoutStructure[] = [];
      const importantSelectors = [
        "body > *",
        "header",
        "nav",
        "main",
        "section",
        "article",
        "aside",
        "footer",
        "[class*='container']",
        "[class*='wrapper']",
        "[class*='hero']",
        "[class*='section']",
      ];

      const processedElements = new Set<Element>();

      importantSelectors.forEach((selector) => {
        try {
          document.querySelectorAll(selector).forEach((el) => {
            if (processedElements.has(el) || structures.length >= 50) return;
            processedElements.add(el);

            const styles = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            if (rect.height === 0 || rect.width === 0) return;

            structures.push({
              tag: el.tagName.toLowerCase(),
              classes: el.className.toString().substring(0, 200),
              id: el.id || undefined,
              role: el.getAttribute("role") || undefined,
              styles: {
                display: styles.display,
                position: styles.position,
                width: styles.width,
                height: rect.height > 50 ? styles.height : undefined,
                maxWidth:
                  styles.maxWidth !== "none" ? styles.maxWidth : undefined,
                margin: styles.margin,
                padding: styles.padding,
                backgroundColor:
                  styles.backgroundColor !== "rgba(0, 0, 0, 0)"
                    ? styles.backgroundColor
                    : undefined,
                gap: styles.gap !== "normal" ? styles.gap : undefined,
                gridTemplateColumns:
                  styles.gridTemplateColumns !== "none"
                    ? styles.gridTemplateColumns
                    : undefined,
                flexDirection: styles.display.includes("flex")
                  ? styles.flexDirection
                  : undefined,
                justifyContent:
                  styles.display.includes("flex") ||
                  styles.display.includes("grid")
                    ? styles.justifyContent
                    : undefined,
                alignItems:
                  styles.display.includes("flex") ||
                  styles.display.includes("grid")
                    ? styles.alignItems
                    : undefined,
              },
              textContent:
                el.childNodes.length === 1 && el.childNodes[0]?.nodeType === 3
                  ? el.textContent?.trim().substring(0, 100)
                  : undefined,
              children: el.children.length,
            });
          });
        } catch {
          return;
        }
      });

      return structures;
    });

    const spacingDetails: SpacingDetails = await page.evaluate(() => {
      const maxWidths = new Set<string>();
      const paddings = new Set<string>();
      const margins = new Set<string>();
      const gaps = new Set<string>();

      document.querySelectorAll("*").forEach((el) => {
        const styles = window.getComputedStyle(el);

        if (
          styles.maxWidth &&
          styles.maxWidth !== "none" &&
          !styles.maxWidth.includes("100%")
        ) {
          maxWidths.add(styles.maxWidth);
        }

        if (styles.padding && styles.padding !== "0px") {
          paddings.add(styles.padding);
        }

        if (styles.margin && styles.margin !== "0px") {
          margins.add(styles.margin);
        }

        if (styles.gap && styles.gap !== "normal" && styles.gap !== "0px") {
          gaps.add(styles.gap);
        }
      });

      return {
        containerMaxWidths: Array.from(maxWidths)
          .slice(0, 10)
          .sort((a, b) => {
            const aNum = parseFloat(a);
            const bNum = parseFloat(b);
            return bNum - aNum;
          }),
        commonPaddings: Array.from(paddings).slice(0, 15),
        commonMargins: Array.from(margins).slice(0, 15),
        commonGaps: Array.from(gaps).slice(0, 10),
      };
    });

    const animations = await page.evaluate(() => {
      const anims = new Set<string>();
      document.querySelectorAll("*").forEach((el) => {
        const styles = window.getComputedStyle(el);
        if (
          styles.animation &&
          styles.animation !== "none" &&
          styles.animation !== ""
        ) {
          anims.add(styles.animation);
        }
        if (
          styles.transition &&
          styles.transition !== "all 0s ease 0s" &&
          styles.transition !== ""
        ) {
          anims.add(`transition: ${styles.transition}`);
        }
      });
      return Array.from(anims).slice(0, 20);
    });

    const backgroundsAndShadows = await page.evaluate(() => {
      const bgImages = new Set<string>();
      const shadows = new Set<string>();

      document.querySelectorAll("*").forEach((el) => {
        const styles = window.getComputedStyle(el);

        if (
          styles.backgroundImage &&
          styles.backgroundImage !== "none" &&
          !styles.backgroundImage.includes("data:image")
        ) {
          bgImages.add(styles.backgroundImage);
        }

        if (styles.boxShadow && styles.boxShadow !== "none") {
          shadows.add(styles.boxShadow);
        }
      });

      return {
        backgroundImages: Array.from(bgImages).slice(0, 20),
        boxShadows: Array.from(shadows).slice(0, 15),
      };
    });

    const colors = extractColors(html);
    const fonts = extractFonts(html);
    const layout = analyzeLayout(html);
    const components = analyzeComponents(html, url);
    const gradients = extractGradients(html);

    const structuredDescription = createStructuredDescription(
      html,
      title,
      colors,
      fonts,
      layout,
      components,
      layoutStructure,
      gradients,
      spacingDetails,
      computedStyles,
      allCSS,
      backgroundsAndShadows,
    );

    const markdown = structuredDescription;

    console.log("Advanced scraping successful:", {
      hasHtml: !!html,
      htmlLength: html.length,
      hasScreenshot: !!screenshot,
      hasMarkdown: !!markdown,
      colorsExtracted: colors.allColors.length,
      fontsExtracted: fonts.headingFonts.length + fonts.bodyFonts.length,
      componentsFound:
        components.buttons.count +
        components.cards.count +
        components.forms.count,
      logosFound: components.media.logos.length,
      imagesFound: components.media.images.length,
      videosFound: components.media.videos.length,
      cssExtracted: allCSS.length,
      computedStylesExtracted: !!computedStyles,
      layoutStructureExtracted: layoutStructure.length,
      gradientsExtracted: gradients.length,
      animationsExtracted: animations.length,
    });

    return {
      html,
      markdown,
      title,
      description,
      url,
      screenshot,
      metaTags,
      links: links.slice(0, 50),
      extractedData: {
        theme: {
          ...colors,
          computedStyles,
          gradients,
          backgroundImages: backgroundsAndShadows.backgroundImages,
          boxShadows: backgroundsAndShadows.boxShadows,
        },
        typography: {
          ...fonts,
          fontSize: computedStyles.body.fontSize || "16px",
          fontWeights: computedStyles.headings.map((h) => h.fontWeight || ""),
          letterSpacing: computedStyles.headings.map((h) => h.lineHeight || ""),
        },
        layout: {
          ...layout,
          structure: layoutStructure,
          spacing: spacingDetails,
        },
        designElements: {
          borderRadius: computedStyles.buttons[0]?.borderRadius || "0.5rem",
          shadows: backgroundsAndShadows.boxShadows.length > 0,
          spacing: "1rem",
          css: allCSS.substring(0, 40000),
          animations: animations,
          transitions: animations.filter((a) => a.includes("transition")),
        },
        components: {
          buttonStyle: computedStyles.buttons[0]?.borderRadius || "rounded",
          cardStyle: "elevated",
          navigationStyle: "horizontal",
          detected: components,
          media: components.media,
        },
      },
    };
  } catch (error) {
    console.error("Error in scrapeWebsiteAdvanced:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
