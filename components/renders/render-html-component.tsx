"use client";

import React, { useEffect, useState } from "react";

import type { ChatFile } from "@/utils/completion-parser";

export default function RenderHtmlComponent({ files }: { files: ChatFile[] }) {
  // State to track the currently displayed file
  const [currentFile, setCurrentFile] = useState<ChatFile | null>(
    files.length > 0 ? files[0] : null,
  );

  // Update current file when files prop changes
  useEffect(() => {
    if (files.length > 0) {
      setCurrentFile(files[0]);
    }
  }, [files]);

  // Function to find a file by name
  const findFileByName = (name: string): ChatFile | null => {
    // Try exact match first
    let file = files.find((f) => f.name === name);

    // If not found, try without ./ prefix
    if (!file && name.startsWith("./")) {
      file = files.find((f) => f.name === name.substring(2));
    }

    // If not found, try just the filename (without path)
    if (!file) {
      const fileName = name.split("/").pop();
      if (fileName) {
        file = files.find((f) => f.name === fileName);
      }
    }

    return file || null;
  };

  // Handle message from iframe
  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === "linkClick") {
      const href = event.data.href;

      // Handle anchor links
      if (href.startsWith("#")) {
        return; // Let the iframe handle this
      }

      // Extract filename from href
      let fileName = href;

      // Remove query params and hash
      if (fileName.includes("?")) {
        fileName = fileName.split("?")[0];
      }
      if (fileName.includes("#")) {
        fileName = fileName.split("#")[0];
      }

      // Find the file
      const file = findFileByName(fileName);

      if (file) {
        setCurrentFile(file);
      }
    }
  };

  // Add event listener for messages from iframe
  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]); // Re-add listener when files change

  // Inject script to intercept link clicks
  const injectLinkInterceptor = (content: string): string => {
    const script = `
      <script>
        document.addEventListener('click', function(e) {
          // Find closest anchor element
          let target = e.target;
          while (target && target.tagName !== 'A') {
            target = target.parentElement;
          }

          // If we found an anchor with href
          if (target && target.href) {
            const href = target.getAttribute('href');

            // Don't intercept anchor links (let browser handle them)
            if (href && href.startsWith('#')) {
              return;
            }

            // Always prevent default navigation
            e.preventDefault();

            // Only send message for relative links (internal navigation)
            if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('//')) {
              // Send message to parent for internal links
              window.parent.postMessage({
                type: 'linkClick',
                href: href
              }, '*');
            }
            // For external links, do nothing (navigation is blocked)
          }
        }, true);
      </script>
    `;

    // Insert script before closing body tag
    if (content.includes("</body>")) {
      return content.replace("</body>", `${script}</body>`);
    }

    // If no body tag, append to the end
    return content + script;
  };

  // Prepare content with interceptor script
  const prepareContent = (): string => {
    if (!currentFile) return "";
    return injectLinkInterceptor(currentFile.content);
  };

  return (
    <iframe
      srcDoc={prepareContent()}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
      }}
      className="bg-white"
      sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
      allow="credentialless"
      loading="eager"
    />
  );
}
