/**
 * Generates a SEO-friendly display title for a component
 * Never shows "Version #-1" - defaults to a proper fallback
 * No longer generates auto-titles like "React Component" - only uses user-defined titles
 */
export function getDisplayTitle(
  title: string | null | undefined,
  version: number | undefined,
): string {
  // If we have a custom title, use it
  if (title && title.trim()) {
    return title;
  }

  // Normalize version - treat undefined, null, or negative as 0
  const normalizedVersion =
    version !== undefined && version !== null && version >= 0 ? version : 0;

  // Always return version number - no more auto-generated framework titles
  return `Version #${normalizedVersion}`;
}

/**
 * Generates the full document title for SEO
 */
export function getDocumentTitle(
  title: string | null | undefined,
  version: number | undefined,
): string {
  const displayTitle = getDisplayTitle(title, version);
  return `${displayTitle} - CodeRocket`;
}

/**
 * Safely updates the document title only if we're in a browser environment
 */
export function updateDocumentTitle(
  title: string | null | undefined,
  version: number | undefined,
): void {
  if (typeof document !== "undefined") {
    document.title = getDocumentTitle(title, version);
  }
}
