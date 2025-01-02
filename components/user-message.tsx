import hljs from "highlight.js";
import React from "react";
import "highlight.js/styles/atom-one-dark.css";

export function UserMessage({ children }: { children: string }) {
  const renderContent = (content: string) => {
    const isCode =
      /<\s*\/?\s*\w+/.test(content) || /function|const|let|var/.test(content);

    if (isCode) {
      const highlightedContent = hljs.highlightAuto(content).value;
      return (
        <div className="relative w-full overflow-x-auto">
          <div className="min-w-[80ch] pr-10 text-sm">
            <pre className="text-sm">
              <code dangerouslySetInnerHTML={{ __html: highlightedContent }} />
            </pre>
          </div>
        </div>
      );
    } else {
      return (
        <div className="relative w-full overflow-x-auto text-sm">{content}</div>
      );
    }
  };

  return renderContent(children);
}
