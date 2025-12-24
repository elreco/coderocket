import type { Framework } from "@/utils/config";

/**
 * Generates a SEO-friendly display title for a component
 * Never shows "Version #-1" - defaults to a proper fallback
 */
export function getDisplayTitle(
  title: string | null | undefined,
  version: number | undefined,
  framework?: Framework | string | null,
): string {
  // If we have a custom title, use it
  if (title && title.trim()) {
    return title;
  }

  // Normalize version - treat undefined, null, or negative as 0
  const normalizedVersion =
    version !== undefined && version !== null && version >= 0 ? version : 0;

  // If version is 0 and no title, show a framework-specific default
  if (normalizedVersion === 0 && framework) {
    const frameworkName = getFrameworkDisplayName(framework);
    return `${frameworkName} Component`;
  }

  // Default fallback with version number
  return `Version #${normalizedVersion}`;
}

/**
 * Generates the full document title for SEO
 */
export function getDocumentTitle(
  title: string | null | undefined,
  version: number | undefined,
  framework?: Framework | string | null,
): string {
  const displayTitle = getDisplayTitle(title, version, framework);
  return `${displayTitle} - CodeRocket`;
}

/**
 * Gets a user-friendly framework name for display
 */
function getFrameworkDisplayName(framework: Framework | string): string {
  const frameworkMap: Record<string, string> = {
    react: "React",
    vue: "Vue",
    svelte: "Svelte",
    angular: "Angular",
    html: "HTML",
  };
  return frameworkMap[framework.toLowerCase()] || "Web";
}

/**
 * Safely updates the document title only if we're in a browser environment
 */
export function updateDocumentTitle(
  title: string | null | undefined,
  version: number | undefined,
  framework?: Framework | string | null,
): void {
  if (typeof document !== "undefined") {
    document.title = getDocumentTitle(title, version, framework);
  }
}
