import { StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { draculaInit } from "@uiw/codemirror-theme-dracula";
import CodeMirror, {
  ReactCodeMirrorRef,
  StateEffect,
} from "@uiw/react-codemirror";
import saveAs from "file-saver";
import JSZip from "jszip";
import { Clipboard, Download } from "lucide-react";
import { useRef, useEffect } from "react";
import React from "react";
import { useCopyToClipboard } from "usehooks-ts";

import RenderHtmlComponent from "@/app/(content)/render-html-component";
import RenderReactComponent from "@/app/(content)/render-react-component";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChatFile } from "@/utils/completion-parser";
import { getLanguageExtension } from "@/utils/file-extensions";

import { CodePreviewFileTree } from "./code-preview-filetree";
import { useComponentContext } from "./component-context";
import ChatSkeleton from "./component-skeleton";

const RenderContent = React.memo(
  ({
    isLoading,
    chatFiles,
    selectedFramework,
    artifactFiles,
    setIframeSrc,
  }: {
    isLoading: boolean;
    chatFiles: ChatFile[];
    selectedFramework: string;
    artifactFiles: ChatFile[];
    setIframeSrc: (url: string) => void;
  }) => {
    if (isLoading && chatFiles.length === 0) {
      return (
        <div className="flex size-full items-center justify-center">
          <ChatSkeleton />
        </div>
      );
    }
    if (!isLoading && chatFiles.length > 0 && selectedFramework === "html") {
      return <RenderHtmlComponent files={chatFiles} />;
    }

    if (selectedFramework === "react") {
      return (
        <RenderReactComponent
          isLoading={isLoading}
          files={artifactFiles}
          onServerReady={(url) => setIframeSrc(url)}
        />
      );
    }

    return (
      <div className="flex size-full items-center justify-center">
        <img src="/placeholder.svg" alt="No artifacts" />
      </div>
    );
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
    return (
      areFilesEqual(prevProps.chatFiles, nextProps.chatFiles) &&
      areFilesEqual(prevProps.artifactFiles, nextProps.artifactFiles)
    );
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
    setIframeSrc,
  } = useComponentContext();
  const [, copy] = useCopyToClipboard();
  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);
  const downloadCode = async () => {
    if (!artifactFiles.length) return;
    const zip = new JSZip();

    artifactFiles.forEach((file) => {
      zip.file(`${file.name || "component.html"}`, file.content);
    });

    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, "tailwindai-dev.zip");
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
      duration: 5000,
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
          chatFiles={chatFiles}
          selectedFramework={selectedFramework}
          artifactFiles={artifactFiles}
          setIframeSrc={setIframeSrc}
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
            <div className="flex items-start justify-start p-2">
              <CodePreviewFileTree />
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
                lang={activeTab.split(".").pop() || "html"}
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
