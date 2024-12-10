import { html } from "@codemirror/lang-html";
import { draculaInit } from "@uiw/codemirror-theme-dracula";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import clsx from "clsx";
import saveAs from "file-saver";
import JSZip from "jszip";
import { Clipboard, Download } from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { iframeBuilder } from "@/utils/iframe-builder";

export default function CodePreview({
  completion,
  isCanvas,
  isLoading,
}: {
  completion: string;
  isCanvas: boolean;
  isLoading: boolean;
}) {
  const [, copy] = useCopyToClipboard();
  const [iframeContent, setIframeContent] = useState("");
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState("component");
  const { id } = useParams();

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (completion) {
        const content = iframeBuilder(completion, id?.toString() || "");
        setIframeContent(content);
      } else {
        setIframeContent("");
      }
    }, 300);
  }, [completion]);

  const downloadCode = async () => {
    const htmlContent = completion || "";

    if (!htmlContent) return;
    const zip = new JSZip();
    const iframeContent = iframeBuilder(completion, id?.toString() || "");
    zip.file("component.html", completion);
    zip.file("page.html", iframeContent);

    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, "tailwindai-dev.zip");
    });
  };

  const copyRawHTML = () => {
    const { value } = getCodeContent();

    if (!value) return;
    copy(value);
    toast({
      variant: "default",
      title: "Successfully copied",
      description:
        "Your component has been successfully saved to your clipboard",
      duration: 5000,
    });
  };

  const getCodeContent = () => {
    switch (activeTab) {
      case "component":
        return {
          value: completion,
          lang: "html",
          extensions: [html()],
        };
      case "page":
        return {
          value: iframeBuilder(completion, id?.toString() || ""),
          lang: "html",
          extensions: [html()],
        };
      default:
        return { value: completion, lang: "html", extensions: [html()] };
    }
  };

  const { value, lang, extensions } = getCodeContent();

  return (
    <div className="flex size-full flex-col overflow-hidden rounded-md border xl:flex-row">
      <div
        className={clsx(
          "group flex flex-col transition-all xl:visible xl:h-full",
          isCanvas ? "visible h-full xl:w-full" : "invisible h-0 xl:w-1/2",
        )}
      >
        <iframe
          className="prose mx-auto size-full border-none"
          srcDoc={iframeContent}
          title="Preview"
        />
      </div>
      <div
        className={clsx(
          "group w-full transition-all xl:h-full",
          isCanvas
            ? "invisible h-0 xl:invisible xl:w-0"
            : "visible h-full xl:visible xl:w-1/2",
        )}
      >
        <div className="relative flex size-full flex-col rounded-none border-none">
          <Tabs
            defaultValue="component"
            className="relative flex flex-1 flex-col items-start justify-start"
            onValueChange={setActiveTab}
          >
            <TabsList className="flex w-full items-start justify-start rounded-none border-none">
              <TabsTrigger value="component">component.html</TabsTrigger>
              <TabsTrigger value="page">page.html</TabsTrigger>
            </TabsList>

            <TabsContent
              value={activeTab}
              className="m-0 flex h-0 w-full grow transition-all duration-300 ease-in-out"
            >
              <CodeMirror
                theme={draculaInit({
                  settings: {
                    background: "hsl(var(--secondary))",
                    gutterBackground: "hsl(var(--secondary))",
                  },
                })}
                value={value || ""}
                lang={lang}
                height="100%"
                width="100%"
                className="size-full rounded-r-md"
                extensions={[...extensions, EditorView.lineWrapping]}
                readOnly
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  highlightActiveLine: true,
                  highlightActiveLineGutter: true,
                  highlightSpecialChars: true,
                  tabSize: 2,
                }}
              />
            </TabsContent>
          </Tabs>
          <div className="absolute bottom-0 right-0 m-1 flex items-center justify-center space-x-1 ease-out hover:ease-in xl:hidden group-hover:xl:flex">
            {!isLoading && (
              <Button
                variant="outline"
                onClick={copyRawHTML}
                className="flex items-center rounded-sm"
              >
                <span className="mr-1 text-nowrap text-xs">Copy code</span>{" "}
                <Clipboard className="w-4" />
              </Button>
            )}

            {!isLoading && (
              <Button
                variant="outline"
                onClick={downloadCode}
                className="flex items-center rounded-sm"
              >
                <span className="mr-1 text-nowrap text-xs">Download</span>{" "}
                <Download className="w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
