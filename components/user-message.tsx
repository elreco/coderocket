import hljs from "highlight.js";
import React from "react";
import "highlight.js/styles/atom-one-dark.css";

export function UserMessage({ children }: { children: string }) {
  const renderContent = (content: string) => {
    const isCode =
      /<\s*\/?\s*\w+/.test(content) ||
      (/\b(function|const|let|var)\b/.test(content) && /\{|\}/.test(content));

    if (isCode) {
      const highlightedContent = hljs.highlightAuto(content).value;
      return (
        <div className="relative w-full overflow-x-auto">
          <pre className="min-w-[80ch] whitespace-pre-wrap break-words pr-10 text-sm">
            <code
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: highlightedContent }}
            />
          </pre>
        </div>
      );
    } else {
      return <p className="whitespace-pre-line text-sm">{content}</p>;
    }
  };

  return renderContent(children);
}
