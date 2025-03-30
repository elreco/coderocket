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
        screenshot: websiteData.screenshot,
        sectionScreenshots: websiteData.sectionScreenshots,
        structure: {
          ...websiteData.structure,
          // Ajouter une description de la mise en page pour l'IA
          layoutDescription: generateLayoutDescription(websiteData),
          menu: websiteData.structure?.menu || [],
          colors: websiteData.structure?.colors || [],
          fonts: websiteData.structure?.fonts || [],
          cssVariables: websiteData.structure?.cssVariables || {},
          cta: websiteData.structure?.cta || [],
          imageStyles: websiteData.structure?.imageStyles || [],
          spacingPattern: websiteData.structure?.spacingPattern || "",
        },
        heroImages: websiteData.images
          .filter((img) => img.isHero || img.type === "background")
          .slice(0, 5),
        visibleImages: websiteData.images
          .filter((img) => img.isVisible)
          .slice(0, 15),
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
      gridColumns?: number;
      flexDirection?: string;
      responsive?: boolean;
    };
    sections?: Array<{
      title?: string;
      content?: string;
      type: string;
      headingCount?: number;
      imageCount?: number;
      paragraphCount?: number;
      className?: string;
      id?: string;
    }>;
    domTreeDepth?: number;
    buttons?: Array<{
      text: string;
      style: string;
    }>;
    cta?: Array<{
      text: string;
      url?: string;
      style?: string;
    }>;
    imageStyles?: Array<{
      style: string;
      count: number;
    }>;
    spacingPattern?: string;
    fonts?: string[];
    colors?: string[];
    cssVariables?: Record<string, string>;
  };
  images?: Array<{
    url: string;
    isHero?: boolean;
    type?: string;
  }>;
}): string {
  const structure = websiteData.structure || {};
  const layout = structure.layout || {};
  const images = websiteData.images || [];

  let description = "Website layout: ";

  // Décrire la mise en page générale
  if (layout.header) description += "Has header. ";
  if (layout.footer) description += "Has footer. ";
  if (layout.sidebar) description += "Has sidebar. ";

  if (layout.mainContent) {
    if (layout.mainContent === "grid" && layout.gridColumns) {
      description += `Main content uses ${layout.mainContent} layout with approximately ${layout.gridColumns} columns. `;
    } else if (layout.mainContent === "flex" && layout.flexDirection) {
      description += `Main content uses flexbox with ${layout.flexDirection} direction. `;
    } else {
      description += `Main content uses ${layout.mainContent} layout. `;
    }
  }

  // Décrire la réactivité (responsive)
  if (layout.responsive) {
    description += "Website is responsive. ";
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
    const mainSections = structure.sections.filter(
      (s) => s.type === "main" || s.type === "section" || s.type === "article",
    );

    if (mainSections.length > 0) {
      description += `Contains ${mainSections.length} main sections: `;

      // Compter combien de sections contiennent des images
      const sectionsWithImages = mainSections.filter(
        (s) => s.imageCount && s.imageCount > 0,
      ).length;
      if (sectionsWithImages > 0) {
        description += `${sectionsWithImages} sections with images. `;
      }
    }
  }

  // Décrire les images d'arrière-plan et les héros
  const heroImages = images.filter(
    (img) => img.isHero || img.type === "background",
  );
  if (heroImages.length > 0) {
    description += `Features ${heroImages.length} hero/background images. `;
  }

  // Décrire les styles d'images
  if (structure.imageStyles && structure.imageStyles.length > 0) {
    description += `Uses ${structure.imageStyles.length} distinct image styling patterns. `;
  }

  // Décrire les boutons
  if (structure.buttons && structure.buttons.length > 0) {
    description += `Has ${structure.buttons.length} distinctive button styles. `;
  }

  // Décrire les CTA
  if (structure.cta && structure.cta.length > 0) {
    description += `Contains ${structure.cta.length} call-to-action elements. `;
  }

  // Décrire les polices
  if (structure.fonts && structure.fonts.length > 0) {
    description += `Uses ${structure.fonts.length} font families. `;
  }

  // Décrire le schéma de couleurs
  if (structure.colors && structure.colors.length > 0) {
    const colorCount = structure.colors.length;
    description += `Color palette uses approximately ${colorCount} colors. `;

    // Vérifier si des variables CSS sont utilisées pour les couleurs
    if (
      structure.cssVariables &&
      Object.keys(structure.cssVariables).length > 0
    ) {
      const colorVars = Object.keys(structure.cssVariables).filter(
        (v) =>
          v.toLowerCase().includes("color") ||
          v.toLowerCase().includes("bg") ||
          v.toLowerCase().includes("background"),
      );

      if (colorVars.length > 0) {
        description += `Site uses CSS variables for color theming. `;
      }
    }
  }

  // Décrire les tendances de spacing
  if (structure.spacingPattern) {
    description += `Common spacing values: ${structure.spacingPattern}. `;
  }

  return description;
}
