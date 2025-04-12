/**
 * parent-iframe-handler.js
 * Handles communication with iframe for element selection
 */

(function() {
  console.log("[Buildr] Parent handler script loaded");

  let selectedElementSelector = null;
  let iframeElement = null;
  let callbackFunction = null;
  let isWaitingForResponse = false;
  let isSelectionActive = false;

  // Function to initialize element selection feature
  // @ts-ignore
  window.initIframeElementSelector = function(iframe, callback) {
    console.log("[Buildr] Initializing element selector with iframe:", iframe);

    if (!iframe) {
      console.error("[Buildr] No iframe provided to initIframeElementSelector");
      return {
        startSelection: () => console.error("No iframe available"),
        getSelectedSelector: () => null,
        cancelSelection: () => console.error("No iframe available")
      };
    }

    // Store references
    iframeElement = iframe;
    callbackFunction = callback;

    // Remove any existing listener to avoid duplicates
    window.removeEventListener("message", handleIframeMessage);

    // Add new message listener
    window.addEventListener("message", handleIframeMessage);

    console.log("[Buildr] Parent iframe handler initialized successfully");

    // Return the API
    return {
      startSelection: requestElementSelection,
      getSelectedSelector: function() { return selectedElementSelector; },
      cancelSelection: cancelElementSelection
    };
  };

  // Handle messages from the iframe
  function handleIframeMessage(event) {
    console.log("[Buildr] Message received in parent:", event.data?.type, "from", event.origin);

    if (!event.data || !event.data.type) {
      console.log("[Buildr] Ignoring message without type");
      return;
    }

    // Handle iframe-messenger ready notification
    if (event.data.type === "iframe-messenger-ready") {
      console.log("[Buildr] iframe-messenger is ready in iframe");

      // If we were waiting for a response, try again now that we know the script is loaded
      if (isWaitingForResponse && iframeElement) {
        setTimeout(() => {
          requestElementSelection();
        }, 100);
      }
    }

    // Handle activation confirmation
    if (event.data.type === "element-selector-activated") {
      console.log("[Buildr] Element selector activated in iframe");
      isWaitingForResponse = false;
      isSelectionActive = true;
    }

    // Handle element selector result
    if (event.data.type === "element-selector-result") {
      selectedElementSelector = event.data.selector;
      console.log("[Buildr] Element selected:", selectedElementSelector);

      // Reset waiting state
      isWaitingForResponse = false;
      isSelectionActive = false;

      // Call the callback function if provided
      if (callbackFunction && typeof callbackFunction === "function") {
        callbackFunction(selectedElementSelector);
      }
    }

    // Handle cancellation confirmation
    if (event.data.type === "element-selector-cancelled") {
      console.log("[Buildr] Element selection cancelled by iframe");
      isWaitingForResponse = false;
      isSelectionActive = false;
    }
  }

  // Request element selection from iframe
  function requestElementSelection() {
    if (!iframeElement) {
      console.error("[Buildr] No iframe reference available");
      return;
    }

    console.log("[Buildr] Requesting element selection...");

    // Set waiting state
    isWaitingForResponse = true;
    isSelectionActive = false;

    try {
      // Verify the iframe is loaded
      if (!iframeElement.contentWindow) {
        console.error("[Buildr] iframe contentWindow not available");
        return;
      }

      // Send message to request element selection
      iframeElement.contentWindow.postMessage({
        type: "get-element-selector"
      }, "*");
      console.log("[Buildr] Selection request sent");

      // Set a timeout to detect if no response comes back
      setTimeout(() => {
        if (isWaitingForResponse) {
          console.log("[Buildr] No response received, trying direct approach");

          // Try to inject script directly as a fallback
          try {
            const script = document.createElement("script");
            script.textContent = `
              // Try to send to the iframe
              try {
                const iframe = document.querySelector("iframe");
                if (iframe && iframe.contentWindow) {
                  iframe.contentWindow.postMessage({
                    type: "get-element-selector",
                    source: "direct-inject"
                  }, "*");
                  console.log("[Buildr] Direct injection attempted");
                }
              } catch (e) {
                console.error("[Buildr] Direct injection failed:", e);
              }
            `;
            document.head.appendChild(script);
          } catch (err) {
            console.error("[Buildr] Error in fallback injection:", err);
          }
        }
      }, 1000);
    } catch (e) {
      console.error("[Buildr] Failed to send message to iframe:", e);
    }
  }

  // Cancel element selection and clean up
  function cancelElementSelection() {
    if (!iframeElement || !iframeElement.contentWindow) {
      console.error("[Buildr] Cannot cancel selection - no iframe reference");
      return;
    }

    console.log("[Buildr] Cancelling element selection");

    try {
      // Send cancel message to iframe regardless of isSelectionActive state
      // This ensures we attempt to cancel even if the state tracking got out of sync
      iframeElement.contentWindow.postMessage({
        type: "cancel-element-selector"
      }, "*");

      // Reset states immediately to ensure UI is responsive
      isSelectionActive = false;
      isWaitingForResponse = false;

      console.log("[Buildr] Cancel request sent to iframe");
    } catch (e) {
      console.error("[Buildr] Failed to send cancel message:", e);
    }
  }
})();