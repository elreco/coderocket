import ReactMarkdown from "react-markdown";

import { remarkPlugins } from "@/utils/markdown";
import { rehypePlugins } from "@/utils/markdown";

export function UserMessage({ children }: { children: string }) {
  return (
    <div className="relative w-full overflow-x-auto">
      <div className="min-w-[80ch] pr-10 text-sm">
        <ReactMarkdown
          className="markdown text-sm"
          remarkPlugins={remarkPlugins(true)}
          rehypePlugins={rehypePlugins(false)}
        >
          {children}
        </ReactMarkdown>
      </div>
    </div>
  );
}
