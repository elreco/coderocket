"use server";

import { scrapeWebsite } from "@/utils/agents/website-scraper";

/**
 * Server Action qui remplace l'API /api/tools/clone-website
 * Cette fonction clone un site web en récupérant son contenu via scraping
 */
export async function cloneWebsite(url: string, fullPage?: boolean) {
  try {
    if (!url) {
      throw new Error("URL is required");
    }

    // Lancer l'opération de scraping
    const websiteData = await scrapeWebsite(url, { fullPage });

    // Retourner les données pour l'IA
    return {
      success: true,
      data: {
        title: websiteData.title,
        description: websiteData.description,
        url: websiteData.url,
        imageCount: websiteData.images.length,
        images: websiteData.images.slice(0, 20),
        metaTags: websiteData.metaTags || {},
        html: websiteData.html,
        structure: {
          ...websiteData.structure,
          // Ajouter une description de la mise en page pour l'IA
          layoutDescription: generateLayoutDescription(websiteData),
          menu: websiteData.structure?.menu || [],
          colors: websiteData.structure?.colors || [],
          fonts: websiteData.structure?.fonts || [],
        },
      },
    };
  } catch (error) {
    console.error("Error in cloneWebsite server action:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Génère une description textuelle de la mise en page pour aider l'IA à comprendre le site
 */
function generateLayoutDescription(websiteData: {
  structure?: {
    layout?: {
      header?: boolean;
      footer?: boolean;
      sidebar?: boolean;
      mainContent?: string;
    };
    sections?: Array<{
      title?: string;
      content?: string;
      type: string;
    }>;
    domTreeDepth?: number;
    buttons?: Array<{
      text: string;
      style: string;
    }>;
  };
}): string {
  const structure = websiteData.structure || {};
  const layout = structure.layout || {};

  let description = "Website layout: ";

  // Décrire la mise en page générale
  if (layout.header) description += "Has header. ";
  if (layout.footer) description += "Has footer. ";
  if (layout.sidebar) description += "Has sidebar. ";

  if (layout.mainContent) {
    description += `Main content uses ${layout.mainContent} layout. `;
  }

  // Décrire la complexité DOM
  if (structure.domTreeDepth) {
    const complexity =
      structure.domTreeDepth > 15
        ? "complex"
        : structure.domTreeDepth > 8
          ? "moderate"
          : "simple";
    description += `DOM complexity is ${complexity} (depth: ${structure.domTreeDepth}). `;
  }

  // Décrire les sections
  if (structure.sections && structure.sections.length > 0) {
    description += `Contains ${structure.sections.length} main sections. `;
  }

  // Décrire les boutons
  if (structure.buttons && structure.buttons.length > 0) {
    description += `Has ${structure.buttons.length} distinctive button styles. `;
  }

  return description;
}
