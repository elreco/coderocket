import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import clsx from "clsx";
import saveAs from "file-saver";
import JSZip from "jszip";
import { Clipboard, Download } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cssContent, getHtmlContent } from "@/utils/config";

const MemoizedSandpack = ({
  completion,
  isCanvas,
  isLoading,
}: {
  completion: string;
  isCanvas: boolean;
  isLoading: boolean;
}) => {
  const [, copy] = useCopyToClipboard();
  const htmlContent = getHtmlContent(completion);
  const downloadCode = () => {
    const zip = new JSZip();
    zip.file("index.html", htmlContent);
    zip.file("tailwindai.css", cssContent);

    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, "tailwindai-dev.zip");
    });
  };

  const copyRawHTML = useCallback(() => {
    copy(completion);
    toast({
      variant: "default",
      title: "Successfully copied",
      description:
        "Your component has been successfully saved to your clipboard",
      duration: 5000,
    });
  }, [completion, copy]);

  const sandpackFiles = useMemo(
    () => ({
      "/completion.html": {
        code: completion,
      },
      "/index.html": {
        code: getHtmlContent(completion),
      },
      "/tailwindai.css": {
        code: cssContent,
      },
    }),
    [completion],
  );

  return (
    <SandpackProvider
      style={{ height: "100%" }}
      options={{
        autoReload: true,
        recompileMode: "delayed",
        recompileDelay: 250,
        visibleFiles: ["/index.html", "/tailwind.css"],
        activeFile: "/completion.html",
      }}
      template="static"
      customSetup={{
        entry: "/index.html",
      }}
      files={sandpackFiles}
    >
      <div
        className={clsx(
          "flex size-full flex-col xl:flex-row",
          !isCanvas ? "gap-3" : "gap-0",
        )}
      >
        <div
          className={clsx(
            "transition-all xl:visible xl:h-full",
            !isCanvas ? "xl:w-1/2" : "xl:w-full",
            !isCanvas ? "invisible h-0" : "visible h-full",
          )}
        >
          <SandpackLayout
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              height: "100%",
              width: "100%",
            }}
          >
            <SandpackPreview
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
            />
          </SandpackLayout>
        </div>
        <div
          className={clsx(
            "group transition-all xl:h-full",
            isCanvas ? "xl:invisible xl:w-0" : "xl:visible xl:w-1/2",
            !isCanvas ? "visible h-full" : "invisible h-0",
          )}
        >
          <SandpackLayout
            style={{
              flex: 1,
              display: "flex",
              position: "relative",
              flexDirection: "column",
              height: "100%",
              width: "100%",
            }}
          >
            <SandpackCodeEditor
              showRunButton={false}
              showReadOnly={false}
              showTabs={false}
              readOnly
            />
            <div className="absolute right-0 top-0 m-2 flex flex-col items-center justify-center space-y-2 transition duration-300  xl:hidden group-hover:xl:flex">
              {!isLoading && (
                <Button
                  variant="outline"
                  onClick={copyRawHTML}
                  className="flex items-center"
                >
                  <span className="mr-1 text-nowrap text-xs transition duration-300">
                    Copy code
                  </span>{" "}
                  <Clipboard className="w-4" />
                </Button>
              )}

              {!isLoading && (
                <Button
                  variant="outline"
                  onClick={downloadCode}
                  className="flex items-center"
                >
                  <span className="mr-1 text-nowrap text-xs transition duration-300">
                    Download
                  </span>{" "}
                  <Download className="w-4" />
                </Button>
              )}
            </div>
          </SandpackLayout>
        </div>
      </div>
    </SandpackProvider>
  );
};

export default MemoizedSandpack;
