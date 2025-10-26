import { StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiAngular,
} from "@icons-pack/react-simple-icons";
import { draculaInit } from "@uiw/codemirror-theme-dracula";
import CodeMirror, {
  ReactCodeMirrorRef,
  StateEffect,
} from "@uiw/react-codemirror";
import saveAs from "file-saver";
import JSZip from "jszip";
import { Clipboard, Download, Pencil } from "lucide-react";
import { useRef, useEffect } from "react";
import React from "react";
import { useCopyToClipboard } from "usehooks-ts";

import RenderComponent from "@/app/(default)/components/[slug]/component-preview";
import RenderHtmlComponent from "@/components/renders/render-html-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  }: {
    isLoading: boolean;
    artifactFiles: ChatFile[];
    selectedFramework: Framework;
    isLengthError: boolean;
    currentGeneratingFile: string | null;
    isWebcontainerReady: boolean;
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
        <RenderHtmlComponent files={artifactFiles} />
      );
    }

    return <RenderComponent />;
  },
  (prevProps, nextProps) => {
    if (prevProps.selectedFramework !== nextProps.selectedFramework)
      return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.currentGeneratingFile !== nextProps.currentGeneratingFile)
      return false;
    if (prevProps.isWebcontainerReady !== nextProps.isWebcontainerReady)
      return false;

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
  } = useComponentContext();
  const { buildError } = useWebcontainer();
  const [, copy] = useCopyToClipboard();
  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);
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

  // Créer un StateField pour gérer le scroll
  const scrollField = StateField.define<number>({
    create: () => 0,
    update: (value, tr) => {
      if (!tr.docChanged) return value;
      return tr.startState.doc.length
        ? (tr.startState.doc.length / tr.state.doc.length) * value
        : value;
    },
  });

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const view = codeMirrorRef.current?.view as EditorView;
    if (!view) return;

    const scrollToBottom = () => {
      if (isLoading) {
        view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight;
      }
    };

    const scrollInterval = setInterval(scrollToBottom, 250);

    return () => {
      clearInterval(scrollInterval);
    };
  }, [chatFiles, isLoading]);

  useEffect(() => {
    if (codeMirrorRef.current?.view) {
      const view = codeMirrorRef.current.view as EditorView;
      view.dispatch({
        effects: StateEffect.appendConfig.of([scrollField]),
      });
    }
  }, []);

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
        />
      </div>
      <div
        className={cn(
          "group transition-opacity",
          isCanvas ? "opacity-0 size-0" : "opacity-100 size-full",
        )}
      >
        <div className="relative flex size-full flex-col rounded-none border-none">
          <div className="relative flex flex-1 flex-col items-start justify-start">
            <div className="flex w-full items-center justify-between border-b border-border p-2">
              <CodePreviewFileTree />
              <div className="flex items-center gap-1">
                <Badge className="hover:bg-primary">
                  <FrameworkIcon className="mr-1 size-3" />
                  <span className="first-letter:uppercase">
                    {selectedFramework}
                  </span>
                </Badge>
                {!isLoading && !isLengthError && !buildError && (
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={copyRawHTML}
                          className="size-8"
                        >
                          <Clipboard className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy code</TooltipContent>
                    </Tooltip>

                    {authorized && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setSidebarTab("github")}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Modify code</TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={downloadCode}
                          className="size-8"
                        >
                          <Download className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download project</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
            <div className="m-0 flex h-0 w-full max-w-full grow">
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
                className={`size-full max-w-full ${
                  isLoading ? "pointer-events-none overflow-hidden" : ""
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
