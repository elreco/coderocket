/**
 * Global type declarations
 */

// Type for the element selector tool
interface SelectorTool {
  startSelection: () => void;
  getSelectedSelector: () => string | null;
  cancelSelection: () => void;
}

// Extend the window interface to include our iframe element selector functions
interface Window {
  initIframeElementSelector?: (
    iframe: HTMLIFrameElement,
    callback?: (selector: string) => void,
  ) => SelectorTool;
}
