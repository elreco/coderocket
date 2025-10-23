import { StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
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
import { useComponentContext } from "@/context/component-context";
import { useWebcontainer } from "@/context/webcontainer-context";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChatFile } from "@/utils/completion-parser";
import { Framework } from "@/utils/config";
import { getLanguageExtension } from "@/utils/file-extensions";

import ComponentSettings from "./(settings)/component-settings";
import { CodePreviewFileTree } from "./code-preview-filetree";
import ChatSkeleton from "./component-skeleton";

const RenderContent = React.memo(
  ({
    isLoading,
    artifactFiles,
    selectedFramework,
    isLengthError,
  }: {
    isLoading: boolean;
    artifactFiles: ChatFile[];
    selectedFramework: Framework;
    isLengthError: boolean;
  }) => {
    if (isLoading && artifactFiles.length === 0) {
      return (
        <div className="flex size-full items-center justify-center">
          <ChatSkeleton />
        </div>
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
          : SiVuedotjs;

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
            <div className="flex w-full items-center justify-between p-2">
              <CodePreviewFileTree />
              <div className="flex items-center justify-center space-x-2">
                <Badge className="hover:bg-primary">
                  <FrameworkIcon className="mr-1 size-3" />
                  <span className="first-letter:uppercase">
                    {selectedFramework}
                  </span>
                </Badge>
                {!isLoading && !isLengthError && !buildError && (
                  <>
                    <Button
                      variant="outline"
                      onClick={copyRawHTML}
                      className="flex items-center rounded-sm"
                    >
                      <span className="mr-1 hidden text-nowrap text-xs xl:block">
                        Copy code
                      </span>{" "}
                      <Clipboard className="w-4" />
                    </Button>

                    <ComponentSettings>
                      <Button
                        variant="outline"
                        className="flex items-center rounded-sm"
                      >
                        <span className="mr-1 hidden text-nowrap text-xs xl:block">
                          Modify code
                        </span>{" "}
                        <Pencil className="w-4" />
                      </Button>
                    </ComponentSettings>

                    <Button
                      variant="outline"
                      onClick={downloadCode}
                      className="flex items-center rounded-sm"
                    >
                      <span className="mr-1 hidden text-nowrap text-xs xl:block">
                        Download project
                      </span>{" "}
                      <Download className="w-4" />
                    </Button>
                  </>
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
                extensions={[getLanguageExtension(activeTab)]}
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
