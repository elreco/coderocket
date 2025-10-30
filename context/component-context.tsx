import { createContext, useContext } from "react";

import { Tables } from "@/types_db";
import { ChatFile } from "@/utils/completion-parser";
import { Framework } from "@/utils/config";

export type ChatMessage = Tables<"messages"> & {
  chats: {
    user: Tables<"users">;
    prompt_image: string | null;
    remix_chat_id: string | null;
  };
  ai_prompt?: string;
};

export type WebcontainerLoadingState =
  | "initializing"
  | "deploying"
  | "starting"
  | "processing"
  | "error"
  | "token-limit"
  | null;

interface ComponentContextType {
  isCanvas: boolean;
  setCanvas: (value: boolean) => void;
  isLoading: boolean;
  setCompletion: (value: string) => void;
  selectedVersion: number | undefined;
  chatFiles: ChatFile[];
  activeTab: string;
  editorValue: string;
  handleVersionSelect: (version: number, tabName?: string) => void;
  authorized: boolean;
  handleSubmitToAI: (input: string) => void;
  completion: string;
  messages: ChatMessage[];
  user: Tables<"users"> | null;
  handleChatFiles: (
    completion: string,
    isFirstRun?: boolean,
    tabName?: string,
  ) => void;
  refreshChatData?: () => Promise<ChatMessage[] | undefined>;
  refreshChat?: () => Promise<void>;
  isVisible: boolean;
  setVisible: (value: boolean) => void;
  input: string;
  setInput: (value: string) => void;
  artifactCode: string;
  setArtifactCode: (value: string) => void;
  forceBuild: boolean;
  setForceBuild: (value: boolean) => void;
  isWebcontainerReady: boolean;
  setWebcontainerReady: (value: boolean) => void;
  artifactFiles: ChatFile[];
  chatId: string;
  selectedFramework: Framework;
  files: File[];
  setFiles: (files: File[] | ((prev: File[]) => File[])) => void;
  defaultImage: string | null;
  defaultFiles: string[];
  loadingState: WebcontainerLoadingState;
  setLoadingState: (value: WebcontainerLoadingState) => void;
  fetchedChat: Tables<"chats"> | null;
  isLengthError: boolean;
  sidebarTab: string;
  setSidebarTab: (tab: string) => void;
  currentGeneratingFile: string | null;
  iframeKey: number;
}

export const ComponentContext = createContext<ComponentContextType | undefined>(
  undefined,
);

export function useComponentContext() {
  const context = useContext(ComponentContext);
  if (!context) {
    throw new Error(
      "useComponentContext doit être utilisé dans ComponentContextProvider",
    );
  }
  return context;
}
