import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiAngular,
} from "@icons-pack/react-simple-icons";
import { draculaInit } from "@uiw/codemirror-theme-dracula";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import saveAs from "file-saver";
import JSZip from "jszip";
import {
  Clipboard,
  Download,
  Pencil,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useRef, useState } from "react";
import React from "react";
import { useCopyToClipboard } from "usehooks-ts";

import RenderComponent from "@/app/(default)/components/[slug]/component-preview";
import RenderHtmlComponent from "@/components/renders/render-html-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useComponentContext } from "@/context/component-context";
import { useWebcontainer } from "@/context/webcontainer-context";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChatFile } from "@/utils/completion-parser";
import { Framework } from "@/utils/config";
import { getLanguageExtension } from "@/utils/file-extensions";

import { CodePreviewFileTree } from "./code-preview-filetree";
import { ComponentLoadingMockup } from "./component-loading-mockup";

const RenderContent = React.memo(
  ({
    isLoading,
    artifactFiles,
    selectedFramework,
    isLengthError,
    currentGeneratingFile,
    isWebcontainerReady,
    iframeKey,
  }: {
    isLoading: boolean;
    artifactFiles: ChatFile[];
    selectedFramework: Framework;
    isLengthError: boolean;
    currentGeneratingFile: string | null;
    isWebcontainerReady: boolean;
    iframeKey?: number;
  }) => {
    if (isLoading && !isWebcontainerReady) {
      return (
        <ComponentLoadingMockup fileName={currentGeneratingFile || undefined} />
      );
    }
    if (
      !isLoading &&
      artifactFiles.length > 0 &&
      selectedFramework === Framework.HTML
    ) {
      return isLengthError ? (
        <div
          className="flex size-full items-center justify-center bg-cover bg-center"
          style={{ backgroundImage: "url(/placeholder.svg)" }}
        ></div>
      ) : (
        <RenderHtmlComponent key={iframeKey} files={artifactFiles} />
      );
    }

    return <RenderComponent key={iframeKey} />;
  },
  (prevProps, nextProps) => {
    if (prevProps.selectedFramework !== nextProps.selectedFramework)
      return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.currentGeneratingFile !== nextProps.currentGeneratingFile)
      return false;
    if (prevProps.isWebcontainerReady !== nextProps.isWebcontainerReady)
      return false;
    if (prevProps.iframeKey !== nextProps.iframeKey) return false;

    const areFilesEqual = (prev: ChatFile[], next: ChatFile[]) => {
      if (prev.length !== next.length) return false;
      return prev.every(
        (file, index) =>
          file.name === next[index].name &&
          file.content === next[index].content,
      );
    };

    // Compare chatFiles only if framework is html
    if (
      nextProps.selectedFramework === Framework.HTML &&
      !areFilesEqual(prevProps.artifactFiles, nextProps.artifactFiles)
    ) {
      return false;
    }

    return true;
  },
);

export default function CodePreview() {
  const {
    isCanvas,
    isLoading,
    chatFiles,
    activeTab,
    editorValue,
    artifactFiles,
    selectedFramework,
    isLengthError,
    setSidebarTab,
    currentGeneratingFile,
    isWebcontainerReady,
    authorized,
    iframeKey,
  } = useComponentContext();
  const { buildError } = useWebcontainer();
  const [, copy] = useCopyToClipboard();
  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(false);
  const downloadCode = async () => {
    if (!artifactFiles.length) return;
    const zip = new JSZip();

    artifactFiles.forEach((file) => {
      zip.file(`${file.name || "component.html"}`, file.content);
    });

    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, "coderocket-dev.zip");
    });
  };

  const copyRawHTML = () => {
    if (!editorValue) return;
    copy(editorValue);
    toast({
      variant: "default",
      title: "Successfully copied",
      description:
        "Your component has been successfully saved to your clipboard",
      duration: 4000,
    });
  };

  const FrameworkIcon =
    selectedFramework === Framework.HTML
      ? SiHtml5
      : selectedFramework === Framework.REACT
        ? SiReact
        : selectedFramework === Framework.SVELTE
          ? SiSvelte
          : selectedFramework === Framework.VUE
            ? SiVuedotjs
            : selectedFramework === Framework.ANGULAR
              ? SiAngular
              : SiHtml5;

  return (
    <div className="flex size-full flex-col overflow-hidden xl:flex-row">
      <div
        className={cn(
          "group flex flex-col items-center justify-center",
          isCanvas ? "opacity-100 size-full" : "opacity-0 size-0",
        )}
      >
        <RenderContent
          isLoading={isLoading}
          artifactFiles={artifactFiles}
          selectedFramework={selectedFramework}
          isLengthError={isLengthError}
          currentGeneratingFile={currentGeneratingFile}
          isWebcontainerReady={isWebcontainerReady}
          iframeKey={iframeKey}
        />
      </div>
      <div
        className={cn(
          "group transition-opacity",
          isCanvas ? "opacity-0 size-0" : "opacity-100 size-full",
        )}
      >
        <div className="relative flex size-full flex-row rounded-none border-none">
          <div
            className={cn(
              "absolute inset-y-0 left-0 z-50 w-64 shrink-0 flex-col bg-background shadow-lg transition-transform duration-300 md:relative md:z-auto md:flex md:shadow-none",
              isFileTreeOpen
                ? "flex translate-x-0"
                : "hidden -translate-x-full md:flex md:translate-x-0",
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border p-2 md:hidden">
              <span className="text-sm font-medium">Files</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFileTreeOpen(false)}
                className="size-8"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </div>
            <div className="h-0 grow overflow-y-auto">
              <CodePreviewFileTree
                onFileSelect={() => setIsFileTreeOpen(false)}
              />
            </div>
          </div>

          {isFileTreeOpen && (
            <div
              className="absolute inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setIsFileTreeOpen(false)}
            />
          )}

          <div className="relative flex flex-1 flex-col items-start justify-start overflow-hidden">
            <div className="m-0 flex h-0 w-full grow rounded-bl-lg border-b border-l border-border">
              <CodeMirror
                ref={codeMirrorRef}
                theme={draculaInit({
                  settings: {
                    background: "hsl(var(--secondary))",
                    gutterBackground: "hsl(var(--secondary))",
                  },
                })}
                value={editorValue}
                lang={activeTab.split(".").pop() || Framework.HTML}
                height="100%"
                width="100%"
                className={`size-full rounded-bl-lg ${
                  isLoading ? "pointer-events-none" : ""
                }`}
                extensions={getLanguageExtension(activeTab, selectedFramework)}
                readOnly
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  highlightActiveLine: true,
                  highlightActiveLineGutter: true,
                  highlightSpecialChars: true,
                  tabSize: 2,
                }}
                style={{ touchAction: "pan-x pan-y", overflow: "auto" }}
              />
            </div>

            <div className="flex w-full items-center gap-2 overflow-x-auto bg-background p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFileTreeOpen(true)}
                className="size-8 shrink-0 md:hidden"
              >
                <PanelLeft className="size-4" />
              </Button>
              <Badge className="shrink-0 hover:bg-primary">
                <FrameworkIcon className="mr-1 size-3" />
                <span className="first-letter:uppercase">
                  {selectedFramework}
                </span>
              </Badge>
              {!isLoading && !isLengthError && !buildError && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyRawHTML}
                    className="h-8 gap-1.5"
                  >
                    <Clipboard className="size-4" />
                    <span className="text-xs">Copy</span>
                  </Button>

                  {authorized && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setSidebarTab("github")}
                    >
                      <Pencil className="size-4" />
                      <span className="text-xs">Modify</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadCode}
                    className="h-8 gap-1.5"
                  >
                    <Download className="size-4" />
                    <span className="text-xs">Download</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
