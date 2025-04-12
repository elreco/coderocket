/**
 * iframe-messenger.js
 * A utility script to facilitate secure cross-origin communication between iframes
 */

(function() {
  // Remove document.domain setting as it's not allowed in sandboxed iframes
  // and focus solely on postMessage which works across origins

  // This script runs in the iframe and enables secure postMessage communication
  // with the parent window to bypass cross-origin restrictions

  // Flag to track if selection mode is active
  let isSelectionModeActive = false;

  // Flag to prevent any click handling after cancellation
  let isCancelled = false;

  // Global event blocker to catch all events after cancellation
  function blockAllEvents(e) {
    if (isCancelled) {
      e.stopPropagation();
      e.preventDefault();
      console.log('Blocked event after cancellation:', e.type);
      return false;
    }
  }

  // Function to generate CSS selector for an element
  function generateSelector(element) {
    let selector = element.tagName.toLowerCase();

    // Add ID if present
    if (element.id) {
      selector += `#${element.id}`;
    }
    // Add classes if no ID
    else if (element.classList.length > 0) {
      const classList = Array.from(element.classList);
      if (classList.length > 0) {
        selector += `.${classList.join('.')}`;
      }
    }

    return selector;
  }

  // Function to highlight an element
  function highlightElement(element) {
    // Create highlight overlay
    const rect = element.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.className = 'tailwind-ai-highlight';
    highlight.style.position = 'absolute';
    highlight.style.left = `${rect.left}px`;
    highlight.style.top = `${rect.top}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    highlight.style.background = 'rgba(66, 153, 225, 0.3)';
    highlight.style.border = '2px solid rgba(66, 153, 225, 0.8)';
    highlight.style.borderRadius = '3px';
    highlight.style.zIndex = '10000';
    highlight.style.pointerEvents = 'none';
    document.body.appendChild(highlight);

    // Remove after a delay
    setTimeout(() => {
      if (document.body.contains(highlight)) {
        document.body.removeChild(highlight);
      }
    }, 1500);
  }

  // Store reference to any active element selector handler
  let activeElementSelectorHandler = null;

  // Create overlay to block all interactions
  function createBlockingOverlay() {
    // Check if it already exists
    if (document.getElementById('tailwind-ai-blocker')) {
      return;
    }

    const blocker = document.createElement('div');
    blocker.id = 'tailwind-ai-blocker';
    blocker.style.position = 'fixed';
    blocker.style.top = '0';
    blocker.style.left = '0';
    blocker.style.width = '100%';
    blocker.style.height = '100%';
    blocker.style.backgroundColor = 'transparent';
    blocker.style.zIndex = '99999';
    blocker.style.cursor = 'default';

    // Prevent all events
    blocker.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('Blocked click via overlay');
      return false;
    }, true);

    blocker.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      return false;
    }, true);

    blocker.addEventListener('mouseup', (e) => {
      e.stopPropagation();
      e.preventDefault();
      return false;
    }, true);

    document.body.appendChild(blocker);

    // Remove after a delay
    setTimeout(() => {
      if (document.body.contains(blocker)) {
        document.body.removeChild(blocker);
      }
    }, 2000);
  }

  // Ensure complete cleanup of all events and highlights
  function cleanupElementSelection() {
    console.log('Starting complete element selection cleanup');

    // Mark as cancelled to block all future events
    isCancelled = true;

    // First, set the mode inactive
    isSelectionModeActive = false;

    // Create blocking overlay
    createBlockingOverlay();

    // Add global event blockers
    ['click', 'mousedown', 'mouseup', 'mousemove'].forEach(eventType => {
      document.addEventListener(eventType, blockAllEvents, true);
    });

    // Remove them after a delay
    setTimeout(() => {
      ['click', 'mousedown', 'mouseup', 'mousemove'].forEach(eventType => {
        document.removeEventListener(eventType, blockAllEvents, true);
      });

      // Reset cancelled flag after delay
      setTimeout(() => {
        isCancelled = false;
      }, 500);
    }, 1000);

    // Remove handler if active
    if (activeElementSelectorHandler) {
      console.log('Removing active click handler');
      document.removeEventListener('click', activeElementSelectorHandler, true);
      document.removeEventListener('click', activeElementSelectorHandler, false);
      activeElementSelectorHandler = null;
    }

    // Remove all other event listeners that might be interfering
    try {
      // Clear event listeners by cloning body
      const oldBody = document.body;
      const newBody = oldBody.cloneNode(true);
      if (oldBody.parentNode) {
        oldBody.parentNode.replaceChild(newBody, oldBody);
      }
    } catch (err) {
      console.error('Error during aggressive event cleanup:', err);
    }

    // Remove any highlight overlays
    const highlights = document.querySelectorAll('.tailwind-ai-highlight');
    highlights.forEach(highlight => {
      if (document.body.contains(highlight)) {
        document.body.removeChild(highlight);
      }
    });

    // Remove any temporary element selection styles
    const tempStyle = document.getElementById('tailwind-ai-temp-style');
    if (tempStyle && tempStyle.parentNode) {
      tempStyle.parentNode.removeChild(tempStyle);
    }

    // Add a style to reset hover states
    const resetStyle = document.createElement('style');
    resetStyle.id = 'tailwind-ai-reset-style';
    resetStyle.textContent = `
      * {
        cursor: auto !important;
        outline: none !important;
        pointer-events: auto !important;
      }
      body * {
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(resetStyle);

    // Remove the reset style after a short delay
    setTimeout(() => {
      const resetStyle = document.getElementById('tailwind-ai-reset-style');
      if (resetStyle && resetStyle.parentNode) {
        resetStyle.parentNode.removeChild(resetStyle);
      }
    }, 1000);

    console.log('Element selection fully cleaned up');
    return true;
  }

  // The main element selector click handler
  function handleElementSelection(e) {
    // Check if cancelled
    if (isCancelled) {
      console.log('Selection has been cancelled, ignoring click');
      e.stopPropagation();
      e.preventDefault();
      return false;
    }

    // Check if selection is still active
    if (!isSelectionModeActive) {
      console.log('Selection mode no longer active, ignoring click');
      e.stopPropagation();
      e.preventDefault();
      return false;
    }

    e.preventDefault();
    e.stopPropagation();
    console.log('Element clicked:', e.target);

    // Highlight the clicked element
    highlightElement(e.target);

    // Generate selector for the clicked element
    const selector = generateSelector(e.target);
    console.log('Generated selector:', selector);

    // Send the selector back to the parent
    window.parent.postMessage({
      type: 'element-selector-result',
      selector: selector
    }, '*'); // Using * since we don't know parent origin in cross-origin contexts

    // Clean up after selection
    cleanupElementSelection();

    return false; // Prevent default and stop propagation
  }

  // Reset selection state - call this on page load and after each cancel
  function resetSelectionState() {
    isSelectionModeActive = false;
    isCancelled = true;

    // Let the cancelled state expire after a short while
    setTimeout(() => {
      isCancelled = false;
    }, 1000);

    if (activeElementSelectorHandler) {
      document.removeEventListener('click', activeElementSelectorHandler, true);
      document.removeEventListener('click', activeElementSelectorHandler, false);
      activeElementSelectorHandler = null;
    }
  }

  // Initialize - call resetSelectionState when script loads
  resetSelectionState();

  // Listen for messages from the parent window
  window.addEventListener('message', function(event) {
    // Accept messages from any origin since we're using the messaging API
    // and we check message types instead

    // Log message for debugging
    console.log('Message received in iframe:', event.data?.type, 'from', event.origin);

    // Handle element selection request
    if (event.data && event.data.type === 'get-element-selector') {
      console.log('Element selection mode activated');

      // Clean up any existing selection
      cleanupElementSelection();

      // Wait a bit to ensure cleanup is complete before activating again
      setTimeout(() => {
        // Reset cancelled state
        isCancelled = false;

        // Set selection mode to active
        isSelectionModeActive = true;

        // Add temporary style to show clickable elements
        const tempStyle = document.createElement('style');
        tempStyle.id = 'tailwind-ai-temp-style';
        tempStyle.textContent = `
          *:hover {
            cursor: pointer !important;
            outline: 2px dashed rgba(66, 153, 225, 0.5) !important;
            pointer-events: auto !important;
          }
        `;
        document.head.appendChild(tempStyle);

        // Create and store the handler function
        activeElementSelectorHandler = handleElementSelection;

        // Add click event listener using stored reference - use capture to ensure we get it first
        document.addEventListener('click', activeElementSelectorHandler, true);

        // Send confirmation that selector mode is active
        window.parent.postMessage({
          type: 'element-selector-activated'
        }, '*');
      }, 200);
    }

    // Handle cancel selection request
    else if (event.data && event.data.type === 'cancel-element-selector') {
      console.log('Cancelling element selection mode');

      // Do full cleanup
      cleanupElementSelection();

      // Always send confirmation that cancel was processed
      window.parent.postMessage({
        type: 'element-selector-cancelled'
      }, '*');
    }
  });

  // Announce that this script is loaded and ready
  console.log('iframe-messenger.js loaded');
  try {
    window.parent.postMessage({
      type: 'iframe-messenger-ready',
      status: 'loaded'
    }, '*');
  } catch (error) {
    console.error('Failed to send ready message to parent:', error);
  }
})();