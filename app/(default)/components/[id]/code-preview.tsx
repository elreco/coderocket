import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { ClipboardIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { githubLight } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";
import clsx from "clsx";
import saveAs from "file-saver";
import JSZip from "jszip";
import { useState, useEffect, useRef } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { ComponentType } from "@/app/api/component/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster/use-toast";
import { downloadBuilder, iframeBuilder } from "@/utils/iframe-builder";

export default function CodePreview({
  completion,
  isCanvas,
  isLoading,
}: {
  completion: ComponentType | null;
  isCanvas: boolean;
  isLoading: boolean;
}) {
  const [, copy] = useCopyToClipboard();
  const [iframeContent, setIframeContent] = useState("");
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState("html");

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (completion?.htmlTemplate) {
        const content = iframeBuilder(completion);
        setIframeContent(content);
      } else {
        setIframeContent("");
      }
    }, 300);
  }, [completion]);

  const downloadCode = async () => {
    const htmlContent = completion?.htmlTemplate || "";

    if (!htmlContent) return;
    const zip = new JSZip();
    const iframeContent = downloadBuilder(completion);
    zip.file("index.html", iframeContent);
    zip.file("tailwind.config.js", completion?.tailwindConfig || "{}");
    zip.file("style.css", completion?.cssFile || "");
    if (completion?.script) {
      zip.file("script.js", completion?.script || "");
    }

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
      case "html":
        return {
          value: completion?.htmlTemplate,
          lang: "html",
          extensions: [html()],
        };
      case "config":
        return {
          value: completion?.tailwindConfig,
          lang: "javascript",
          extensions: [javascript()],
        };
      case "css":
        return { value: completion?.cssFile, lang: "css", extensions: [css()] };
      case "js":
        return {
          value: completion?.script,
          lang: "javascript",
          extensions: [javascript()],
        };
      case "libs":
        return {
          value: completion?.libs,
          lang: "html",
          extensions: [html()],
        };
      default:
        return { value: "", lang: "html", extensions: [html()] };
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
          "group transition-all xl:h-full",
          isCanvas
            ? "invisible h-0 xl:invisible xl:w-0"
            : "visible h-full xl:visible xl:w-1/2",
        )}
      >
        <div className="relative flex size-full flex-col rounded-none border-none">
          <Tabs
            defaultValue="html"
            className="flex size-full flex-col items-start justify-start"
            onValueChange={setActiveTab}
          >
            <TabsList className="flex w-full items-start justify-start">
              <TabsTrigger value="html">index.html</TabsTrigger>
              <TabsTrigger value="config">tailwind.config.js</TabsTrigger>
              <TabsTrigger value="css">style.css</TabsTrigger>
              {completion?.script && (
                <TabsTrigger value="js">script.js</TabsTrigger>
              )}
              {completion?.libs && (
                <TabsTrigger value="libs">libs.html</TabsTrigger>
              )}
            </TabsList>
            <TabsContent
              value={activeTab}
              className="h-0 w-full grow transition-all duration-300 ease-in-out"
            >
              <CodeMirror
                theme={githubLight}
                value={value || ""}
                lang={lang}
                height="100%"
                className="size-full rounded-r-md"
                extensions={extensions}
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
                <ClipboardIcon className="w-4" />
              </Button>
            )}

            {!isLoading && (
              <Button
                variant="outline"
                onClick={downloadCode}
                className="flex items-center rounded-sm"
              >
                <span className="mr-1 text-nowrap text-xs">Download</span>{" "}
                <ArrowDownTrayIcon className="w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
