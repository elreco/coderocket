import { ClipboardCopy } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { codeToHtml, type BundledLanguage, type SpecialLanguage } from "shiki";

import { cn } from "@/lib/utils";

interface CodeBlockProps {
  className?: string;
  code: string;
  language?: BundledLanguage | SpecialLanguage;
  theme?: "light-plus" | "dark-plus";
  disableCopy?: boolean;
}

export const CodeBlock = memo(
  ({
    className,
    code,
    language = "plaintext",
    theme = "dark-plus",
    disableCopy = false,
  }: CodeBlockProps) => {
    const [html, setHTML] = useState<string | undefined>(undefined);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
      if (copied) {
        return;
      }

      navigator.clipboard.writeText(code);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    };

    useEffect(() => {
      const processCode = async () => {
        setHTML(await codeToHtml(code, { lang: language, theme }));
      };

      processCode();
    }, [code]);

    return (
      <div
        className={cn(
          "relative overflow-x-auto group text-left my-4 min-h-10",
          className,
        )}
      >
        <div
          className={cn(
            "bg-white absolute top-1 right-1 rounded-md z-10 text-lg flex items-center justify-center opacity-0 group-hover:opacity-100 mx-2",
            {
              "rounded-l-0 opacity-100": copied,
            },
          )}
        >
          {!disableCopy && (
            <button
              className={cn(
                "flex items-center bg-transparent p-1.5 justify-center before:bg-white before:rounded-l-md before:text-gray-500 before:border-r before:border-gray-300",
                {
                  "before:opacity-0": !copied,
                  "before:opacity-100": copied,
                },
              )}
              title="Copy Code"
              onClick={() => copyToClipboard()}
            >
              <ClipboardCopy className="size-4 text-background" />
            </button>
          )}
        </div>
        <div dangerouslySetInnerHTML={{ __html: html ?? "" }}></div>
      </div>
    );
  },
);
