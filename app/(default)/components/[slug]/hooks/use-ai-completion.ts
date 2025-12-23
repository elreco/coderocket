import { useCompletion } from "@ai-sdk/react";
import { useCallback, useRef } from "react";

import { SelectedElementData } from "@/context/component-context";

interface UseAICompletionOptions {
  chatId: string;
  selectedVersion: number | undefined;
  selectedElement: SelectedElementData | null;
  uploadFilesRef: React.MutableRefObject<File[]>;
  selectedVersionRef: React.MutableRefObject<number | undefined>;
  initialCompletion?: string;
  onError: (error: Error) => void;
  onFinish: () => void;
}

export function useAICompletion({
  chatId,
  selectedVersion,
  selectedElement,
  uploadFilesRef,
  selectedVersionRef,
  initialCompletion,
  onError,
  onFinish,
}: UseAICompletionOptions) {
  const inputRef = useRef("");

  const buildFormData = useCallback(
    (promptValue: string, currentFiles: File[]) => {
      let aiPrompt = promptValue;
      if (selectedElement) {
        const filePathInfo = selectedElement.filePath
          ? `\nFile: ${selectedElement.filePath}`
          : "";
        const elementContext = `Selected element:${filePathInfo}\n\`\`\`html\n${selectedElement.html.substring(0, 1000)}${selectedElement.html.length > 1000 ? "\n... (truncated)" : ""}\n\`\`\`\n\nTag: ${selectedElement.tagName}\nClasses: ${selectedElement.classes.join(", ")}\n\nModify this element: ${promptValue}`;
        aiPrompt = elementContext;
      }

      const formData = new FormData();
      const libraryPaths: string[] = [];
      currentFiles.forEach((file) => {
        const libraryPath = (file as File & { __libraryPath?: string })
          .__libraryPath;
        if (libraryPath) {
          libraryPaths.push(libraryPath);
        } else {
          formData.append("files", file);
        }
      });
      if (libraryPaths.length > 0) {
        formData.append("libraryPaths", JSON.stringify(libraryPaths));
      }
      formData.append("id", chatId);
      formData.append(
        "selectedVersion",
        String(selectedVersionRef.current ?? selectedVersion),
      );
      formData.append("prompt", promptValue);
      formData.append("aiPrompt", aiPrompt);
      if (selectedElement) {
        formData.append("selectedElement", JSON.stringify(selectedElement));
      }

      return formData;
    },
    [chatId, selectedElement, selectedVersion, selectedVersionRef],
  );

  const { completion, stop, complete, setCompletion, input, setInput } =
    useCompletion({
      api: "/api/components",
      fetch: async (url, options) => {
        const requestBody = JSON.parse((options?.body as string) || "{}");
        const promptValue = requestBody.prompt || inputRef.current;
        const currentFiles = uploadFilesRef.current;

        const formData = buildFormData(promptValue, currentFiles);

        const response = await fetch(url, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || "An unknown error occurred");
          } catch (e) {
            if (e instanceof Error) {
              throw e;
            }
            const text = await response.text();
            throw new Error(text || "An unknown error occurred");
          }
        }

        return response;
      },
      streamProtocol: "text",
      initialCompletion,
      experimental_throttle: 500,
      onError,
      onFinish,
    });

  const setInputWithRef = useCallback(
    (value: string) => {
      inputRef.current = value;
      setInput(value);
    },
    [setInput],
  );

  return {
    completion,
    stop,
    complete,
    setCompletion,
    input,
    setInput: setInputWithRef,
  };
}
