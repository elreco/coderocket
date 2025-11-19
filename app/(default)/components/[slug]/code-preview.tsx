import { EditorView } from "@codemirror/view";
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
import { useRef, useEffect, useState, useCallback } from "react";
import React from "react";
import { useCopyToClipboard } from "usehooks-ts";

import RenderComponent from "@/app/(default)/components/[slug]/component-preview";
import RenderHtmlComponent from "@/components/renders/render-html-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBuilder } from "@/context/builder-context";
import {
  BreakpointType,
  useComponentContext,
} from "@/context/component-context";
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
    selectedVersion,
    previewPath,
    onHtmlNavigation,
    breakpoint,
    onRouteChange,
  }: {
    isLoading: boolean;
    artifactFiles: ChatFile[];
    selectedFramework: Framework;
    isLengthError: boolean;
    currentGeneratingFile: string | null;
    isWebcontainerReady: boolean;
    iframeKey?: number;
    selectedVersion?: number;
    previewPath: string;
    onHtmlNavigation: (
      path: string,
      options?: { pushHistory?: boolean },
    ) => void;
    breakpoint: BreakpointType;
    onRouteChange: (path: string) => void;
  }) => {
    const isFirstGeneration = selectedVersion === 0;
    const isPreviousVersionError =
      !isFirstGeneration &&
      !isLoading &&
      artifactFiles.length === 0 &&
      !isWebcontainerReady;
    const responsiveWrapperClass = cn(
      "relative size-full transition-all duration-300",
      breakpoint === "desktop" && "w-full h-full",
      breakpoint === "tablet" &&
        "w-[768px] h-full max-w-full max-h-full shadow-2xl",
      breakpoint === "mobile" &&
        "w-[375px] h-full max-w-full max-h-full shadow-2xl",
    );

    if (
      (isLoading && !isWebcontainerReady && isFirstGeneration) ||
      isPreviousVersionError
    ) {
      return (
        <ComponentLoadingMockup fileName={currentGeneratingFile || undefined} />
      );
    }
    if (
      !isLoading &&
      artifactFiles.length > 0 &&
      selectedFramework === Framework.HTML
    ) {
      if (isLengthError) {
        return (
          <div className="flex size-full items-center justify-center">
            <div
              className="flex size-full items-center justify-center bg-cover bg-center"
              style={{ backgroundImage: "url(/placeholder.svg)" }}
            ></div>
          </div>
        );
      }

      return (
        <div className="flex size-full items-center justify-center">
          <div className={responsiveWrapperClass}>
            <RenderHtmlComponent
              key={iframeKey}
              files={artifactFiles}
              navigationTarget={previewPath}
              onNavigation={onHtmlNavigation}
              onRouteChange={onRouteChange}
            />
          </div>
        </div>
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
    if (prevProps.selectedVersion !== nextProps.selectedVersion) return false;
    if (prevProps.previewPath !== nextProps.previewPath) return false;
    if (prevProps.breakpoint !== nextProps.breakpoint) return false;

    const areFilesEqual = (prev: ChatFile[], next: ChatFile[]) => {
      if (prev.length !== next.length) return false;
      return prev.every(
        (file, index) =>
          file.name === next[index].name &&
          file.content === next[index].content,
      );
    };

    if (prevProps.artifactFiles.length !== nextProps.artifactFiles.length) {
      return false;
    }

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
    selectedVersion,
    navigatePreview,
    previewPath,
    breakpoint,
    syncPreviewPath,
  } = useComponentContext();
  const { buildError } = useBuilder();
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

  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentLengthRef = useRef<number>(0);

  useEffect(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    if (!isLoading) {
      lastContentLengthRef.current = 0;
      return;
    }

    const scrollToBottom = () => {
      const view = codeMirrorRef.current?.view as EditorView;
      if (!view) return;

      const currentLength = view.state.doc.length;

      if (currentLength === lastContentLengthRef.current) {
        return;
      }

      lastContentLengthRef.current = currentLength;

      requestAnimationFrame(() => {
        try {
          if (!view.scrollDOM) return;

          const cmScroller = view.scrollDOM.querySelector(
            ".cm-scroller",
          ) as HTMLElement;

          const scrollTarget = cmScroller || view.scrollDOM;

          if (scrollTarget) {
            scrollTarget.scrollTo({
              top: scrollTarget.scrollHeight,
              behavior: "auto",
            });
          }
        } catch (error) {
          console.error("Scroll error:", error);
        }
      });
    };

    scrollToBottom();

    scrollIntervalRef.current = setInterval(scrollToBottom, 200);

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [isLoading, editorValue]);

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

  const handleHtmlNavigation = useCallback(
    (path: string, options?: { pushHistory?: boolean }) => {
      navigatePreview(path, {
        pushHistory: options?.pushHistory,
      });
    },
    [navigatePreview],
  );

  const handleHtmlRouteChange = useCallback(
    (path: string) => {
      syncPreviewPath(path);
    },
    [syncPreviewPath],
  );

  return (
    <div className="flex size-full flex-col overflow-hidden xl:flex-row">
      <div
        className={cn(
          "group flex flex-col items-center justify-center",
          isCanvas ? "size-full opacity-100" : "size-0 opacity-0",
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
          selectedVersion={selectedVersion}
          previewPath={previewPath}
          onHtmlNavigation={handleHtmlNavigation}
          breakpoint={breakpoint}
          onRouteChange={handleHtmlRouteChange}
        />
      </div>
      <div
        className={cn(
          "group transition-opacity",
          isCanvas ? "size-0 opacity-0" : "size-full opacity-100",
        )}
      >
        <div className="relative flex size-full flex-row rounded-none border-none">
          <div
            className={cn(
              "bg-background absolute inset-y-0 left-0 z-50 w-64 shrink-0 flex-col shadow-lg transition-transform duration-300 md:relative md:z-auto md:flex md:shadow-none",
              isFileTreeOpen
                ? "flex translate-x-0"
                : "hidden -translate-x-full md:flex md:translate-x-0",
            )}
          >
            <div className="border-border flex shrink-0 items-center justify-between border-b p-2 md:hidden">
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
            <div className="border-border m-0 flex h-0 w-full grow rounded-bl-lg border-b border-l">
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

            <div className="bg-background flex w-full items-center gap-2 overflow-x-auto p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFileTreeOpen(true)}
                className="size-8 shrink-0 md:hidden"
              >
                <PanelLeft className="size-4" />
              </Button>
              <Badge className="hover:bg-primary shrink-0">
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
