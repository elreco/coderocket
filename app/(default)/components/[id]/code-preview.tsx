import { html } from "@codemirror/lang-html";
import { StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { draculaInit } from "@uiw/codemirror-theme-dracula";
import CodeMirror, {
  ReactCodeMirrorRef,
  StateEffect,
} from "@uiw/react-codemirror";
import clsx from "clsx";
import saveAs from "file-saver";
import JSZip from "jszip";
import { Clipboard, Download } from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { handleAIcompletionForHTML } from "@/utils/completion-parser";
import { getURL } from "@/utils/helpers";
import { iframeBuilder } from "@/utils/iframe-builder";

import ChatSkeleton from "./component-skeleton";

export default function CodePreview({
  completion,
  chatId,
  isCanvas,
  isLoading,
  selectedTheme,
  selectedVersion,
}: {
  completion: string;
  chatId: string;
  isCanvas: boolean;
  isLoading: boolean;
  selectedTheme: string;
  selectedVersion: number;
}) {
  const [, copy] = useCopyToClipboard();
  const { id } = useParams();
  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);
  const [editorValue, setEditorValue] = useState("");

  const [htmlFiles, setHtmlFiles] = useState<
    { name: string | null; content: string }[]
  >([]);

  const [activeTab, setActiveTab] = useState(() => {
    if (htmlFiles.length > 0) {
      const lastFile = htmlFiles[htmlFiles.length - 1];
      setEditorValue(lastFile.content);
      return lastFile.name || "";
    }
    return "";
  });

  useEffect(() => {
    const lastFile = htmlFiles[htmlFiles.length - 1];
    if (!lastFile) {
      setEditorValue("");
      setActiveTab("");
      return;
    }

    setEditorValue(lastFile.content);
    setActiveTab(lastFile.name || "");
  }, [htmlFiles]);

  const downloadCode = async () => {
    if (!htmlFiles.length) return;
    const zip = new JSZip();

    htmlFiles.forEach((file) => {
      zip.file(`${file.name || "component"}.html`, file.content);
    });

    const iframeContent = iframeBuilder(
      htmlFiles,
      id?.toString() || "",
      selectedTheme,
    );

    zip.file(`page.html`, iframeContent);

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

  const handleHtmlFiles = (completion: string) => {
    setHtmlFiles([]);
    const files = handleAIcompletionForHTML(completion);
    if (files.length > 0) {
      setHtmlFiles(files);
    }
  };

  const handleChange = (value: string) => {
    setActiveTab(value);
    const file = htmlFiles.find((file) => file.name === value);
    if (file) setEditorValue(file.content);
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

    // Forcer le scroll vers le bas pendant le chargement
    const scrollToBottom = () => {
      if (isLoading) {
        view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight;
      }
    };
    handleHtmlFiles(completion);

    // Mettre en place un intervalle pour le scroll automatique
    const scrollInterval = setInterval(scrollToBottom, 100);

    return () => {
      clearInterval(scrollInterval);
    };
  }, [completion, isLoading]);

  // Configuration initiale de l'éditeur
  useEffect(() => {
    if (codeMirrorRef.current?.view) {
      const view = codeMirrorRef.current.view as EditorView;
      view.dispatch({
        effects: StateEffect.appendConfig.of([scrollField]),
      });
    }
  }, []);

  useEffect(() => {
    if (completion) {
      handleHtmlFiles(completion);
    }
  }, [selectedVersion]);

  useEffect(() => {
    handleHtmlFiles(completion);
  }, []);

  return (
    <div className="flex size-full flex-col overflow-hidden rounded-md border xl:flex-row">
      <div
        className={clsx(
          "group flex flex-col transition-[width]",
          isCanvas ? "visible size-full" : "invisible size-0",
        )}
      >
        {isLoading ? (
          <div className="flex size-full items-center justify-center">
            <ChatSkeleton />
          </div>
        ) : (
          <iframe
            className="mx-auto size-full border-none"
            src={`${getURL()}/content/${chatId}/${selectedVersion}/${selectedTheme}`}
            title="Preview"
          />
        )}
      </div>

      <div
        className={clsx(
          "group transition-[width]",
          isCanvas ? "invisible size-0" : "visible size-full",
        )}
      >
        <div className="relative flex size-full flex-col rounded-none border-none">
          <Tabs
            value={activeTab}
            className="relative flex flex-1 flex-col items-start justify-start"
            onValueChange={handleChange}
          >
            <TabsList className="flex w-full items-start justify-start rounded-none border-none">
              {htmlFiles.map((file) => (
                <TabsTrigger key={file.name || ""} value={file.name || ""}>
                  {file.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent
              value={activeTab}
              className="m-0 flex h-0 w-full max-w-full grow transition-all duration-300 ease-in-out"
            >
              <CodeMirror
                ref={codeMirrorRef}
                theme={draculaInit({
                  settings: {
                    background: "hsl(var(--secondary))",
                    gutterBackground: "hsl(var(--secondary))",
                  },
                })}
                value={editorValue}
                lang="html"
                height="100%"
                width="100%"
                className={`w-full max-w-full ${
                  isLoading ? "pointer-events-none overflow-hidden" : ""
                }`}
                extensions={[html()]}
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
