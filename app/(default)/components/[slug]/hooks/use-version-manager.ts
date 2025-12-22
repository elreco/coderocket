import { useCallback, useRef, useState } from "react";

import { ChatMessage } from "@/context/component-context";
import {
  ChatFile,
  extractFilesFromArtifact,
  extractFilesFromCompletion,
} from "@/utils/completion-parser";
import { Framework } from "@/utils/config";
import { defaultArtifactCode } from "@/utils/default-artifact-code";
import { getArtifactCodeByVersion } from "@/utils/supabase/artifact-helpers";

interface UseVersionManagerOptions {
  chatId: string;
  framework: Framework | null;
  messages: ChatMessage[];
  artifactFiles: ChatFile[];
  forceBuild: boolean;
  onSetSelectedVersion: (version: number) => void;
  onSetUploadFiles: (files: File[]) => void;
  onSetPreviousArtifactFiles: (files: ChatFile[]) => void;
  onSetIsLengthError: (error: boolean) => void;
  onSetCompletion: (completion: string) => void;
  onSetArtifactCode: (code: string) => void;
  onSetArtifactFiles: (files: ChatFile[]) => void;
  onSetChatFiles: (files: ChatFile[]) => void;
  onSetEditorValue: (value: string) => void;
  onSetActiveTab: (tab: string) => void;
  onSetCanvas: (canvas: boolean) => void;
  onSetWebcontainerReady: (ready: boolean) => void;
}

export function useVersionManager({
  chatId,
  framework,
  messages,
  artifactFiles,
  forceBuild,
  onSetSelectedVersion,
  onSetUploadFiles,
  onSetPreviousArtifactFiles,
  onSetIsLengthError,
  onSetCompletion,
  onSetArtifactCode,
  onSetArtifactFiles,
  onSetChatFiles,
  onSetEditorValue,
  onSetActiveTab,
  onSetCanvas,
  onSetWebcontainerReady,
}: UseVersionManagerOptions) {
  const [selectedVersion, setSelectedVersionState] = useState<
    number | undefined
  >(undefined);
  const selectedVersionRef = useRef<number | undefined>(undefined);

  const handleVersionSelect = useCallback(
    (version: number, tabName?: string) => {
      const isTabChangeOnly = version === selectedVersion && tabName;

      if (!isTabChangeOnly) {
        setSelectedVersionState(version);
        selectedVersionRef.current = version;
        onSetSelectedVersion(version);
        onSetUploadFiles([]);
      }

      const selectedMessages = messages.filter((m) => m.version == version);
      if (selectedMessages.length !== 2) {
        return;
      }

      const selectedAssistantMessage = selectedMessages.find(
        (m) => m.role === "assistant",
      );
      if (!selectedAssistantMessage?.content) {
        return;
      }

      if (!isTabChangeOnly) {
        if (version > 0) {
          void (async () => {
            const previousCode = await getArtifactCodeByVersion(
              chatId,
              version - 1,
            );
            if (previousCode) {
              const previousFiles = extractFilesFromArtifact(previousCode);
              onSetPreviousArtifactFiles(previousFiles);
            } else {
              onSetPreviousArtifactFiles([]);
            }
          })();
        } else {
          onSetPreviousArtifactFiles([]);
        }
      }

      if (!isTabChangeOnly) {
        if (
          selectedAssistantMessage.content.includes(
            "<!-- FINISH_REASON: length -->",
          ) ||
          selectedAssistantMessage.content.includes(
            "<!-- FINISH_REASON: error -->",
          )
        ) {
          onSetIsLengthError(true);
        } else {
          onSetIsLengthError(false);
        }

        onSetCompletion(selectedAssistantMessage.content);
      }

      if (selectedAssistantMessage.artifact_code) {
        if (!isTabChangeOnly) {
          onSetArtifactCode(selectedAssistantMessage.artifact_code);

          const newArtifactFiles = extractFilesFromArtifact(
            selectedAssistantMessage.artifact_code,
          );

          const needsTemplateFiles =
            newArtifactFiles.length === 0 &&
            framework &&
            framework !== Framework.HTML;

          if (needsTemplateFiles) {
            const templateFiles = extractFilesFromArtifact(
              defaultArtifactCode[
                framework as keyof typeof defaultArtifactCode
              ],
            );
            onSetArtifactFiles(templateFiles);
          } else {
            onSetArtifactFiles(newArtifactFiles);
          }

          const files = extractFilesFromCompletion(
            selectedAssistantMessage.content,
          );
          if (files.length > 0) {
            onSetChatFiles(files);
          } else {
            onSetChatFiles([]);
          }
        }

        const currentFiles = isTabChangeOnly
          ? artifactFiles
          : extractFilesFromArtifact(selectedAssistantMessage.artifact_code);

        if (tabName) {
          const file = currentFiles.find((file) => file.name === tabName);
          if (file) {
            onSetEditorValue(file.content);
            onSetActiveTab(tabName);
            onSetCanvas(false);
          }
        } else if (!isTabChangeOnly) {
          const activeFile =
            currentFiles.find((file) => file.isActive) || currentFiles[0];
          if (activeFile) {
            onSetEditorValue(activeFile.content);
            onSetActiveTab(activeFile.name || "");
            onSetCanvas(true);
          }
        }
      }

      if (!isTabChangeOnly) {
        const shouldBeReady = selectedAssistantMessage.is_built && !forceBuild;
        onSetWebcontainerReady(shouldBeReady || false);
      }
    },
    [
      chatId,
      framework,
      messages,
      artifactFiles,
      forceBuild,
      selectedVersion,
      onSetSelectedVersion,
      onSetUploadFiles,
      onSetPreviousArtifactFiles,
      onSetIsLengthError,
      onSetCompletion,
      onSetArtifactCode,
      onSetArtifactFiles,
      onSetChatFiles,
      onSetEditorValue,
      onSetActiveTab,
      onSetCanvas,
      onSetWebcontainerReady,
    ],
  );

  return {
    selectedVersion,
    selectedVersionRef,
    setSelectedVersion: (version: number | undefined) => {
      setSelectedVersionState(version);
      selectedVersionRef.current = version;
    },
    handleVersionSelect,
  };
}
