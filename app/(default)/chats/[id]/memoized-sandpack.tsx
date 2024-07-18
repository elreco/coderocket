import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { ClipboardIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import saveAs from "file-saver";
import JSZip from "jszip";
import { useCallback, useMemo } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster/use-toast";

const cssContent = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
body {
  font-family: 'Inter', sans-serif!important;
}
`;

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
  const downloadCode = () => {
    const htmlContent = `
      <html class="size-full">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css" rel="stylesheet" />
          <link href="tailwindai.css" rel="stylesheet">
        </head>
        ${completion}
      </html>
    `;

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
        code: `<html class="size-full">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css" rel="stylesheet" />
<link href="tailwindai.css" rel="stylesheet">
</head>
${completion}
</html>`,
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
                  <ClipboardIcon className="w-4" />
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
                  <ArrowDownTrayIcon className="w-4" />
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
