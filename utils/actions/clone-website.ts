"use server";

import { scrapeWebsite } from "@/utils/agents/website-scraper";

// Interface pour les données provenant de website-scraper
interface WebsiteContent {
  html: string;
  htmlStructure?: {
    headTags: {
      title: string;
      favicons: string[];
      stylesheets: string[];
      scripts: string[];
      charset: string;
      viewportMeta: string | null;
    };
    bodyStructure: {
      classes: string;
      id: string;
      attributes: Array<{ name: string; value: string }>;
      childrenCount: number;
    };
    semanticElements: Record<
      string,
      {
        count: number;
        details: Array<{
          id: string;
          classes: string;
          childElementCount: number;
          textContent: string;
        }>;
      }
    >;
    domStats: {
      totalElements: number;
      divCount: number;
      spanCount: number;
      paragraphCount: number;
      imageCount: number;
      linkCount: number;
      buttonCount: number;
      formCount: number;
      tableCount: number;
      listCount: number;
    };
    mainContentHtml: string;
    significantElements: Array<{
      selector: string;
      count: number;
      sample: string;
    }>;
  };
  images: Array<{
    url: string;
    alt: string;
    isHero?: boolean;
    isVisible?: boolean;
    type?: string;
    role?: string;
    className?: string;
    dimensions?: { width: number; height: number };
    style?: {
      border?: string;
      borderRadius?: string;
      boxShadow?: string;
      filter?: string;
      backgroundSize?: string;
      backgroundPosition?: string;
      backgroundRepeat?: string;
    };
  }>;
  videos?: Array<{
    url: string;
    type: string;
    provider?: string;
    width?: number;
    height?: number;
    posterImage?: string;
    isVisible?: boolean;
    isAutoplay?: boolean;
    className?: string;
  }>;
  title: string;
  description: string | null;
  url: string;
  screenshot?: string;
  sectionScreenshots?: Record<string, string>;
  metaTags?: Record<string, string>;
  cssContent?: string[];
  structure?: {
    menu?: Array<{ text: string; url: string }>;
    layout?: {
      header?: boolean;
      footer?: boolean;
      sidebar?: boolean;
      mainContent?: string;
      gridColumns?: number;
      flexDirection?: string;
      responsive?: boolean;
      mainContentStructure?: {
        width: string | null;
        maxWidth: string | null;
        padding: string | null;
        margin: string | null;
        centeringStrategy: string | null;
        gap: string | null;
        columnCount: number | null;
        rowCount: number | null;
        columnWidths?: string[];
        gridPattern?: string;
        columnGap?: string;
      };
      responsiveDetails?: {
        mediaQueriesCount: number;
        hasViewportMeta: boolean;
        usesFlexibleUnits: boolean;
        breakpoints: string[];
      };
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
    fontSources?: string[];
    colors?: string[];
    cssVariables?: Record<string, string>;
    visualPatterns?: {
      cardPatterns: Array<{
        selector: string;
        count: number;
        structure: {
          hasImage: boolean;
          hasTitle: boolean;
          hasText: boolean;
          hasButton: boolean;
        };
      }>;
      visualHierarchy: {
        hasSeparators: boolean;
        usesDifferentBackgrounds: boolean;
        usesShadowsForDepth: boolean;
        usesTypographicHierarchy: boolean;
      };
      contentContainersCount: number;
      hasAlternatingRows: boolean;
    };
  };
}

/**
 * Server Action qui clone un site web en récupérant son contenu via scraping
 * Optimisé pour une meilleure fidélité tout en simplifiant le processus
 */
export async function cloneWebsite(url: string) {
  try {
    if (!url) {
      throw new Error("URL is required");
    }

    console.log(`Début du clonage du site: ${url}`);

    // Timeout de 2 minutes pour les sites complexes
    const timeout = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Clonage timeout après 120 secondes")),
        120000,
      );
    });

    // Lancer l'opération de scraping avec le timeout de sécurité
    const scraping = scrapeWebsite(url);
    const websiteData = (await Promise.race([
      scraping,
      timeout,
    ])) as WebsiteContent;

    // Détection des protections anti-bot avancée
    // if (detectAntiBot(websiteData)) {
    //   return {
    //     success: false,
    //     error:
    //       "Anti-bot protection detected. The site uses Cloudflare or similar technology to block scraping.",
    //   };
    // }

    // Retourner les données avec une structure simplifiée mais plus complète
    return {
      success: true,
      data: formatWebsiteData(websiteData),
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
 * Formate les données du site web pour une utilisation optimale par l'IA
 */
function formatWebsiteData(websiteData: WebsiteContent) {
  return {
    // Informations de base
    title: websiteData.title,
    description: websiteData.description,
    url: websiteData.url,

    // Contenu visuel avec optimisation
    html: websiteData.html,
    htmlStructure: websiteData.htmlStructure || {},
    screenshot: websiteData.screenshot,
    sectionScreenshots: websiteData.sectionScreenshots,

    // Ressources médias optimisées
    imageCount: websiteData.images?.length || 0,
    images: websiteData.images?.slice(0, 30) || [], // Augmenté à 30 images
    videoCount: websiteData.videos?.length || 0,
    videos: websiteData.videos?.slice(0, 15) || [], // Augmenté à 15 vidéos

    // Métadonnées et SEO
    metaTags: websiteData.metaTags || {},

    // Styles et CSS
    cssContent: websiteData.cssContent || [],

    // Structure avancée du site
    structure: {
      // Navigation et menus
      menu: websiteData.structure?.menu || [],

      // Mise en page et layout
      layout: websiteData.structure?.layout || {},
      sections: websiteData.structure?.sections || [],
      domTreeDepth: websiteData.structure?.domTreeDepth,

      // Éléments de design
      colors: websiteData.structure?.colors || [],
      fonts: websiteData.structure?.fonts || [],
      fontSources: websiteData.structure?.fontSources || [],
      cssVariables: websiteData.structure?.cssVariables || {},

      // Éléments d'interaction
      buttons: websiteData.structure?.buttons || [],
      cta: websiteData.structure?.cta || [],

      // Style et présentation des images
      imageStyles: websiteData.structure?.imageStyles || [],
      spacingPattern: websiteData.structure?.spacingPattern || "",

      // Patterns de design avancés
      visualPatterns: websiteData.structure?.visualPatterns || {},

      // Description textuelle du layout
      layoutDescription: generateLayoutDescription(websiteData),
    },

    // Collections d'images spéciales
    heroImages: websiteData.images
      .filter((img) => img.isHero || img.type === "background")
      .slice(0, 10),

    visibleImages: websiteData.images
      .filter((img) => img.isVisible)
      .slice(0, 20),

    // Nouvelles collections pour améliorer la fidélité
    backgroundImages: websiteData.images
      .filter((img) => img.type === "background")
      .slice(0, 10),

    logoImages: websiteData.images
      .filter(
        (img) =>
          img.role === "logo" ||
          (img.className &&
            (img.className.toLowerCase().includes("logo") ||
              img.className.toLowerCase().includes("brand"))),
      )
      .slice(0, 5),
  };
}

/**
 * Génère une description textuelle de la mise en page pour aider l'IA à comprendre le site
 */
function generateLayoutDescription(websiteData: WebsiteContent): string {
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

  // Décrire la réactivité (responsive) avec détails
  if (layout.responsive) {
    const responsiveDetails = layout.responsiveDetails;
    if (responsiveDetails) {
      description += `Website is responsive with ${responsiveDetails.mediaQueriesCount} media queries. `;
      if (responsiveDetails.hasViewportMeta) {
        description += `Uses viewport meta tag. `;
      }
      if (responsiveDetails.usesFlexibleUnits) {
        description += `Uses fluid/flexible sizing units. `;
      }
      if (
        responsiveDetails.breakpoints &&
        responsiveDetails.breakpoints.length > 0
      ) {
        description += `Main breakpoints: ${responsiveDetails.breakpoints.slice(0, 2).join(", ")}. `;
      }
    } else {
      description += "Website is responsive. ";
    }
  }

  // Décrire la structure du contenu principal
  const mainContentStructure = layout.mainContentStructure;
  if (mainContentStructure) {
    if (mainContentStructure.centeringStrategy) {
      description += `Content centering uses ${mainContentStructure.centeringStrategy} technique. `;
    }

    if (mainContentStructure.maxWidth) {
      description += `Main content max width: ${mainContentStructure.maxWidth}. `;
    }

    if (
      mainContentStructure.columnCount &&
      mainContentStructure.columnCount > 1
    ) {
      description += `Layout uses ${mainContentStructure.columnCount} columns `;
      if (mainContentStructure.gap) {
        description += `with ${mainContentStructure.gap} gap. `;
      } else {
        description += `. `;
      }
    }

    if (mainContentStructure.gridPattern) {
      description += `Grid template: ${mainContentStructure.gridPattern}. `;
    }
  }

  // Décrire les patterns visuels
  if (structure.visualPatterns) {
    const vp = structure.visualPatterns;

    // Décrire les card patterns
    if (vp.cardPatterns && vp.cardPatterns.length > 0) {
      const cardPattern = vp.cardPatterns[0];
      description += `Uses card-based design with ${cardPattern.count} ${cardPattern.selector} elements. `;

      const cardStructure = cardPattern.structure;
      description += `Cards typically `;
      if (cardStructure.hasImage) description += `include images, `;
      if (cardStructure.hasTitle) description += `have headings, `;
      if (cardStructure.hasText) description += `contain text, `;
      if (cardStructure.hasButton) description += `have buttons/CTAs, `;
      description = description.replace(/, $/, ". ");
    }

    // Décrire la hiérarchie visuelle
    const vh = vp.visualHierarchy;
    if (vh) {
      if (vh.usesDifferentBackgrounds) {
        description += `Uses alternating section backgrounds for visual separation. `;
      }

      if (vh.usesShadowsForDepth) {
        description += `Employs shadows for depth and elevation. `;
      }

      if (vh.usesTypographicHierarchy) {
        description += `Has clear typographic hierarchy. `;
      }

      if (vh.hasSeparators) {
        description += `Uses visual separators/dividers between sections. `;
      }
    }

    if (vp.hasAlternatingRows) {
      description += `Features alternating row styles. `;
    }
  }

  // Décrire les sections
  if (structure.sections && structure.sections.length > 0) {
    const mainSections = structure.sections.filter(
      (s) => s.type === "main" || s.type === "section" || s.type === "article",
    );

    if (mainSections.length > 0) {
      description += `Contains ${mainSections.length} main sections. `;

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

  // Décrire les polices avec plus de détails
  if (structure.fonts && structure.fonts.length > 0) {
    description += `Uses ${structure.fonts.length} font families: ${structure.fonts.slice(0, 3).join(", ")}${structure.fonts.length > 3 ? "..." : ""}. `;

    // Ajouter des informations sur les sources de polices web
    if (structure.fontSources && structure.fontSources.length > 0) {
      const googleFonts = structure.fontSources.filter((src) =>
        src.includes("googleapis"),
      );
      const customFonts = structure.fontSources.filter(
        (src) => !src.includes("googleapis"),
      );

      if (googleFonts.length > 0) {
        description += `Uses Google Fonts. `;
      }

      if (customFonts.length > 0) {
        description += `Uses custom web fonts. `;
      }
    }
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

  // Ajouter des informations sur le CSS
  if (websiteData.cssContent && websiteData.cssContent.length > 0) {
    description += `Contains ${websiteData.cssContent.length} important CSS rules. `;
  }

  return description;
}
