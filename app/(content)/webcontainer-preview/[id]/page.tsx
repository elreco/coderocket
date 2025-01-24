"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchChatById } from "@/app/(default)/components/actions";
import { fetchLastAssistantMessageByChatId } from "@/app/(default)/components/actions";
import RenderReactComponent from "@/components/renders/render-react-component";
import { ComponentContext } from "@/context/component-context";
import { WebContainerProvider } from "@/context/webcontainer-context";
import { ChatFile, extractFilesFromArtifact } from "@/utils/completion-parser";

export default function WebContainerPreview() {
  const params = useParams();
  const id = params.id as string;

  const [artifactFiles, setArtifactFiles] = useState<ChatFile[]>([]);
  const [previewId, setPreviewId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      const chat = await fetchChatById(id);
      const lastAssistantMessage = await fetchLastAssistantMessageByChatId(id);

      if (!lastAssistantMessage) {
        return <div>No content found</div>;
      }
      const artifactFiles = extractFilesFromArtifact(chat.artifact_code || "");
      setArtifactFiles(artifactFiles);
    };
    fetchData();
  }, [id]);

  const contextValue = {
    isCanvas: false,
    setCanvas: () => {},
    isLoading: false,
    selectedVersion: 0,
    chatFiles: [],
    activeTab: "code",
    editorValue: "",
    handleVersionSelect: () => {},
    authorized: false,
    completion: "",
    messages: [],
    user: null,
    handleChatFiles: () => {},
    isVisible: false,
    setVisible: () => {},
    input: "",
    setInput: () => {},
    handleSubmitToAI: () => {},
    setCompletion: () => {},
    artifactCode: "",
    setArtifactCode: () => {},
    chatId: id,
    artifactFiles,
    selectedFramework: "react",
    previewId,
    setPreviewId,
  };

  return (
    <ComponentContext.Provider value={contextValue}>
      <WebContainerProvider>
        <RenderReactComponent files={artifactFiles} />
      </WebContainerProvider>
    </ComponentContext.Provider>
  );
}
