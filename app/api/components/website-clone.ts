import { cloneWebsite } from "@/utils/agents/website-scraper-simple";
import { Framework } from "@/utils/config";
import { isSameDomain } from "@/utils/domain-helper";
import { createClient } from "@/utils/supabase/server";

interface TypographyStyle {
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  letterSpacing: string;
  fontFamily: string;
}

interface ComponentStyle {
  padding?: string;
  fontSize?: string;
  fontWeight?: string;
  borderRadius?: string;
  backgroundColor?: string;
  color?: string;
  boxShadow?: string;
}

interface AdvancedMetadata {
  spacing?: Array<{ value: string; frequency: number }>;
  typography?: Record<string, TypographyStyle>;
  colors?: Array<{ color: string; contexts: string[] }>;
  layout?: {
    usesGrid: boolean;
    usesFlexbox: boolean;
    containerWidths: string[];
    breakpoints?: string[];
  };
  components?: {
    buttons: ComponentStyle[];
    cards: ComponentStyle[];
    navItems: ComponentStyle[];
  };
  jsLibraries?: Array<{ name: string; type: string }>;
  borderRadius?: Array<{ value: string; frequency: number }>;
  boxShadows?: Array<{ value: string; frequency: number }>;
  gradients?: Array<{ value: string; frequency: number }>;
  cssVariables?: Array<{ name: string; value: string; contexts: string[] }>;
  sections?: Array<{
    id?: string | null;
    tag: string;
    title?: string | null;
    selector: string;
    order: number;
    top: number;
    height: number;
    type?: string | null;
  }>;
}

export function optimizeMarkdownForWebsiteClone(markdown: string): string {
  const maxLength = 25000;

  if (markdown.length <= maxLength) {
    return markdown;
  }

  const lines = markdown.split("\n");
  const priorityPatterns = [/^#+\s/, /^\*\s/, /^-\s/, /^\d+\.\s/];

  const priorityLines: string[] = [];
  const regularLines: string[] = [];

  for (const line of lines) {
    const isPriority = priorityPatterns.some((pattern) => pattern.test(line));
    if (isPriority) {
      priorityLines.push(line);
    } else {
      regularLines.push(line);
    }
  }

  let result = "";
  let currentLength = 0;

  for (const line of priorityLines) {
    if (currentLength + line.length > maxLength * 0.8) {
      break;
    }
    result += line + "\n";
    currentLength += line.length + 1;
  }

  for (const line of regularLines) {
    if (currentLength + line.length > maxLength) {
      result += "\n\n... (content truncated to fit token limits) ...";
      break;
    }
    result += line + "\n";
    currentLength += line.length + 1;
  }

  return result.trim();
}

export function filterJSLibrariesByFramework(
  libraries: Array<{ name: string; type: string }>,
  framework: Framework,
): Array<{ name: string; type: string }> {
  const frameworkNames: Record<Framework, string | null> = {
    [Framework.REACT]: "React",
    [Framework.VUE]: "Vue",
    [Framework.SVELTE]: "Svelte",
    [Framework.ANGULAR]: "Angular",
    [Framework.HTML]: null,
  };

  const selectedFramework = frameworkNames[framework];

  return libraries.filter((lib) => {
    if (lib.type === "framework") {
      if (framework === Framework.HTML) {
        return false;
      }
      return lib.name === selectedFramework;
    }
    return true;
  });
}

export function formatAdvancedMetadata(
  metadata: AdvancedMetadata | null,
  framework: Framework,
): string {
  if (!metadata) return "";

  const sections: string[] = [];

  const overviewParts: string[] = [];
  if (metadata.spacing && metadata.spacing.length > 0) {
    overviewParts.push("spacing");
  }
  if (metadata.typography && Object.keys(metadata.typography).length > 0) {
    overviewParts.push("typography");
  }
  if (metadata.colors && metadata.colors.length > 0) {
    overviewParts.push("colors");
  }
  if (metadata.borderRadius && metadata.borderRadius.length > 0) {
    overviewParts.push("border radius");
  }
  if (metadata.boxShadows && metadata.boxShadows.length > 0) {
    overviewParts.push("shadows");
  }
  if (metadata.gradients && metadata.gradients.length > 0) {
    overviewParts.push("gradients");
  }
  if (metadata.cssVariables && metadata.cssVariables.length > 0) {
    overviewParts.push("CSS variables");
  }

  if (overviewParts.length > 0) {
    sections.push(
      `\n## DESIGN TOKENS OVERVIEW\nDetected design system aspects: ${overviewParts.join(
        ", ",
      )}. Reuse these consistently in the generated code.`,
    );
  }

  if (metadata.spacing && metadata.spacing.length > 0) {
    const spacingList = metadata.spacing
      .slice(0, 30)
      .map((s) => `${s.value} (used ${s.frequency}x)`)
      .join(", ");
    sections.push(`\n## SPACING SYSTEM\nCommon spacing values: ${spacingList}`);
  }

  if (metadata.typography && Object.keys(metadata.typography).length > 0) {
    const typographyEntries = Object.entries(metadata.typography)
      .slice(0, 10)
      .map(([tag, styles]: [string, TypographyStyle]) => {
        return `${tag}: ${styles.fontSize} / ${styles.lineHeight}, ${styles.fontWeight}, ${styles.fontFamily}`;
      })
      .join("\n");
    sections.push(`\n## TYPOGRAPHY SCALE\n${typographyEntries}`);
  }

  if (metadata.colors && metadata.colors.length > 0) {
    const colorList = metadata.colors
      .slice(0, 20)
      .map((c) => `${c.color} (${c.contexts.join(", ")})`)
      .join("\n");
    sections.push(`\n## COLOR PALETTE\n${colorList}`);
  }

  if (metadata.borderRadius && metadata.borderRadius.length > 0) {
    const radiusList = metadata.borderRadius
      .slice(0, 20)
      .map((r) => `${r.value} (used ${r.frequency}x)`)
      .join("\n");
    sections.push(`\n## BORDER RADIUS\nCommon radii: ${radiusList}`);
  }

  if (metadata.boxShadows && metadata.boxShadows.length > 0) {
    const shadowList = metadata.boxShadows
      .slice(0, 20)
      .map((s) => `${s.value} (used ${s.frequency}x)`)
      .join("\n");
    sections.push(
      `\n## SHADOWS\nRepresentative box-shadow values:\n${shadowList}`,
    );
  }

  if (metadata.gradients && metadata.gradients.length > 0) {
    const gradientList = metadata.gradients
      .slice(0, 10)
      .map((g) => `${g.value} (used ${g.frequency}x)`)
      .join("\n");
    sections.push(
      `\n## GRADIENT BACKGROUNDS\nRepresentative gradient backgrounds:\n${gradientList}`,
    );
  }

  if (metadata.cssVariables && metadata.cssVariables.length > 0) {
    const cssVarsList = metadata.cssVariables
      .slice(0, 20)
      .map(
        (v) =>
          `${v.name}: ${v.value} (contexts: ${Array.isArray(v.contexts) ? v.contexts.join(", ") : ""})`,
      )
      .join("\n");
    sections.push(
      `\n## CSS VARIABLES\nKey CSS custom properties that define the design system:\n${cssVarsList}`,
    );
  }

  if (metadata.layout) {
    const layoutInfo: string[] = [];
    if (metadata.layout.usesGrid) layoutInfo.push("Grid");
    if (metadata.layout.usesFlexbox) layoutInfo.push("Flexbox");
    if (metadata.layout.containerWidths.length > 0) {
      layoutInfo.push(
        `Container widths: ${metadata.layout.containerWidths.slice(0, 10).join(", ")}`,
      );
    }
    if (metadata.layout.breakpoints && metadata.layout.breakpoints.length > 0) {
      layoutInfo.push(
        `Responsive breakpoints inferred from classes: ${metadata.layout.breakpoints.join(
          ", ",
        )}`,
      );
    }
    if (layoutInfo.length > 0) {
      sections.push(`\n## LAYOUT PATTERNS\n${layoutInfo.join(", ")}`);
    }
  }

  if (metadata.components) {
    const componentInfo: string[] = [];
    if (metadata.components.buttons.length > 0) {
      componentInfo.push(
        `Buttons: ${metadata.components.buttons.length} unique styles detected`,
      );
    }
    if (metadata.components.cards.length > 0) {
      componentInfo.push(
        `Cards: ${metadata.components.cards.length} unique styles detected`,
      );
    }
    if (metadata.components.navItems.length > 0) {
      componentInfo.push(
        `Nav items: ${metadata.components.navItems.length} unique styles detected`,
      );
    }
    if (componentInfo.length > 0) {
      sections.push(`\n## COMPONENT PATTERNS\n${componentInfo.join(", ")}`);
    }
  }

  if (metadata.sections && metadata.sections.length > 0) {
    const sectionLines = metadata.sections
      .slice(0, 20)
      .map((section, index) => {
        const labelParts: string[] = [];
        labelParts.push(section.type || section.tag);
        if (section.title) {
          labelParts.push(`"${section.title}"`);
        }
        return `${index + 1}. ${labelParts.join(" ")} (selector: ${
          section.selector
        }, top: ${section.top}, height: ${section.height})`;
      })
      .join("\n");
    sections.push(
      `\n## SECTION MAP\nHigh-level sections in scroll order. Recreate all of them in the generated page:\n${sectionLines}`,
    );
  }

  return sections.length > 0 ? `\n# DESIGN SYSTEM${sections.join("")}` : "";
}

export interface CloneUrlInfo {
  urlToClone: string | null;
  isAdditionalPageClone: boolean;
}

export function detectCloneUrl(
  cloneUrl: string | null,
  prompt: string | null,
  selectedVersion: number | undefined,
): CloneUrlInfo {
  if (!cloneUrl) {
    return { urlToClone: null, isAdditionalPageClone: false };
  }

  const promptToCheck = prompt || "";

  if (promptToCheck.includes("Clone another page:")) {
    const anotherPageMatch = promptToCheck.match(
      /Clone another page:\s*(https?:\/\/[^\s]+)/,
    );
    if (anotherPageMatch && anotherPageMatch[1]) {
      const requestedUrl = anotherPageMatch[1];
      if (isSameDomain(cloneUrl, requestedUrl)) {
        return { urlToClone: requestedUrl, isAdditionalPageClone: true };
      } else {
        throw new Error(
          "Cannot clone a page from a different domain. Please use a URL from the same website.",
        );
      }
    }
  } else if (
    selectedVersion === undefined ||
    selectedVersion === 0 ||
    selectedVersion === -1
  ) {
    return { urlToClone: cloneUrl, isAdditionalPageClone: false };
  }

  return { urlToClone: null, isAdditionalPageClone: false };
}

export interface CloneResult {
  enhancedPrompt: string;
  userDisplayPrompt: string;
  cloneScreenshot: string | null;
}

export async function processWebsiteClone(
  urlToClone: string,
  isAdditionalPageClone: boolean,
  framework: Framework,
  userId: string,
): Promise<CloneResult> {
  const supabase = await createClient();
  let enhancedPrompt = "";
  let userDisplayPrompt = isAdditionalPageClone
    ? `Clone another page: ${urlToClone}`
    : "";
  let cloneScreenshot: string | null = null;

  try {
    const cloneResult = await cloneWebsite(urlToClone);

    if (cloneResult.success && cloneResult.data) {
      const data = cloneResult.data;

      const videosData =
        (
          data as {
            videos?: Array<{
              url: string;
              type: string;
              platform: string;
              embedUrl?: string;
              videoId?: string;
              poster?: string | null;
            }>;
          }
        ).videos || [];

      console.log("🧠 Scrape payload sent to AI:", {
        url: urlToClone,
        title: data.title,
        description: data.description,
        htmlLength: data.html?.length || 0,
        markdownLength: data.markdown?.length || 0,
        hasScreenshot: Boolean(data.screenshot),
        images: data.images || [],
        videos: videosData,
        designMetadata: data.designMetadata || null,
      });

      const optimizedMarkdown = data.markdown
        ? optimizeMarkdownForWebsiteClone(data.markdown)
        : "";

      console.log("📊 Markdown optimization:");
      console.log("Original length:", data.markdown?.length || 0);
      console.log("Optimized length:", optimizedMarkdown.length);
      console.log(
        "Reduction:",
        Math.round(
          (1 - optimizedMarkdown.length / (data.markdown?.length || 1)) * 100,
        ) + "%",
      );

      const images = (
        data as {
          images?: Array<{ url: string; alt: string; isLogo: boolean }>;
        }
      ).images;
      const imagesList =
        images && images.length > 0
          ? `\n\n# IMAGE ASSETS\nUse these exact URLs for images:\n${images
              .filter((img) => img.isLogo)
              .map(
                (img, idx) =>
                  `${idx + 1}. Logo: ${img.url} (alt: "${img.alt}")`,
              )
              .join("\n")}\n${images
              .filter((img) => !img.isLogo)
              .slice(0, 30)
              .map(
                (img, idx) =>
                  `${idx + 1}. Image: ${img.url} (alt: "${img.alt}")`,
              )
              .join("\n")}`
          : "";

      const videos = (
        data as {
          videos?: Array<{
            url: string;
            type: string;
            platform: string;
            embedUrl?: string;
            videoId?: string;
            poster?: string | null;
          }>;
        }
      ).videos;
      const videosList =
        videos && videos.length > 0
          ? `\n\n# VIDEO ASSETS\nUse these videos in your implementation:\n${videos
              .slice(0, 10)
              .map((video, idx) => {
                if (video.platform === "youtube") {
                  return `${idx + 1}. YouTube: ${video.url} (embed: ${video.embedUrl || video.url})`;
                } else if (video.platform === "vimeo") {
                  return `${idx + 1}. Vimeo: ${video.url} (embed: ${video.embedUrl || video.url})`;
                } else {
                  return `${idx + 1}. Video: ${video.url}${video.poster ? ` (poster: ${video.poster})` : ""}`;
                }
              })
              .join("\n")}`
          : "";

      const designMetadata = data.designMetadata as AdvancedMetadata | null;
      const simplifiedHTML =
        (data as { simplifiedHTML?: string }).simplifiedHTML || "";

      const advancedMetadataSection = formatAdvancedMetadata(
        designMetadata,
        framework,
      );

      const structureHTMLSection =
        simplifiedHTML &&
        simplifiedHTML.length > 0 &&
        simplifiedHTML.length < 5000
          ? `\n\n# HTML STRUCTURE\nUse this structure as reference for the page hierarchy:\n\`\`\`html\n${simplifiedHTML}\n\`\`\``
          : "";

      const filteredLibraries = designMetadata?.jsLibraries
        ? filterJSLibrariesByFramework(
            designMetadata.jsLibraries,
            framework,
          )
        : [];
      const jsLibrariesSection =
        filteredLibraries.length > 0
          ? `\n\n# JAVASCRIPT LIBRARIES\nDetected libraries compatible with ${framework}: ${filteredLibraries.map((lib) => lib.name).join(", ")}`
          : "";

      const frameworkInstruction = `IMPORTANT: Use ${framework} (the selected framework) for the component structure. Use Tailwind CSS for all styling.${filteredLibraries.length > 0 ? ` Integrate the detected libraries (${filteredLibraries.map((lib) => lib.name).join(", ")}) for interactive features and animations, but ensure they are compatible with ${framework}.` : ""} Match the responsive behavior implied by the detected layout patterns and breakpoints.`;

      const completenessInstruction = `CRITICAL: Recreate the ENTIRE page, not just what is visible in the screenshot. Use the markdown, HTML structure, section map and all extracted content to rebuild every section: header, navigation, hero, all main content sections, sidebars, long-scrolling content, footer, modals, popups, and any repeated blocks. If the screenshot stops before the end of the page, still generate the full page layout and content based on the provided text and structure. Every visible element in the screenshot must be recreated, and no logical section from the content is allowed to be omitted. Preserve the order and relative visual importance of sections as described in the metadata.`;

      if (isAdditionalPageClone) {
        enhancedPrompt = `Clone another page from the same website: ${urlToClone}

# VISUAL REFERENCE
A screenshot is attached. Use it as a visual reference for layout, colors, fonts, spacing, and design, but do not limit the implementation to only what is visible in the screenshot. Always combine it with the full content and structure provided below to recreate the complete page.${advancedMetadataSection}${structureHTMLSection}${jsLibrariesSection}

# CONTENT
Use this content in your implementation:

${optimizedMarkdown}${imagesList}${videosList}

**Instructions:**
${frameworkInstruction}

${completenessInstruction}

This is an additional page from the same website. Maintain consistency with the existing design system while incorporating the new content and layout from this page. The screenshot shows the design. The content above provides the text, images, and videos. Combine both to create an accurate clone.`;
      } else {
        enhancedPrompt = `Clone this website: ${urlToClone}

# VISUAL REFERENCE
A screenshot is attached. Use it as a visual reference for layout, colors, fonts, spacing, and design, but do not limit the implementation to only what is visible in the screenshot. Always combine it with the full content and structure provided below to recreate the complete page.${advancedMetadataSection}${structureHTMLSection}${jsLibrariesSection}

# CONTENT
Use this content in your implementation:

${optimizedMarkdown}${imagesList}${videosList}

**Instructions:**
${frameworkInstruction}

${completenessInstruction}

The screenshot shows the design. The content above provides the text, images, and videos. Combine both to create an accurate clone.`;
      }

      if (cloneResult.data.screenshot) {
        try {
          const buffer = Buffer.from(cloneResult.data.screenshot, "base64");
          console.log(
            "Screenshot buffer size (from builder):",
            buffer.length,
            "bytes",
          );

          if (buffer.length < 100) {
            throw new Error("Screenshot buffer is too small, likely invalid");
          }

          const screenshotFileName = `${Date.now()}-${userId}-screenshot.jpg`;
          const { data: imageData, error: imageError } =
            await supabase.storage
              .from("images")
              .upload(screenshotFileName, buffer, {
                contentType: "image/jpeg",
                cacheControl: "3600",
              });

          if (!imageError && imageData?.path) {
            cloneScreenshot = imageData.path;
            console.log("✅ Screenshot uploaded successfully");
          } else {
            console.error("❌ Failed to upload screenshot:", imageError);
          }
        } catch (screenshotError) {
          console.error("Error uploading screenshot:", screenshotError);
          console.log("Continuing without screenshot");
        }
      }
    } else {
      console.log("⚠️ Clone failed, continuing with URL only");
      const action = isAdditionalPageClone ? "another page" : "this website";
      enhancedPrompt = `Clone ${action}: ${urlToClone}

Unable to extract complete website data. Please recreate the visual layout and functionality based on the URL provided.
Use standard Tailwind CSS classes and shadcn/ui components.`;
    }
  } catch (error) {
    console.error("Error during website cloning:", error);
    if (
      error instanceof Error &&
      error.message.includes("different domain")
    ) {
      throw error;
    }
    const action = isAdditionalPageClone ? "another page" : "this website";
    enhancedPrompt = `Clone ${action}: ${urlToClone}

Unable to extract complete website data. Please recreate the visual layout and functionality based on the URL provided.
Use standard Tailwind CSS classes and shadcn/ui components.`;
  }

  return {
    enhancedPrompt,
    userDisplayPrompt,
    cloneScreenshot,
  };
}
