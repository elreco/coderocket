import { createContext, useContext } from "react";

import type { CustomDomainData } from "@/types/custom-domain";
import type { Tables } from "@/types_db";
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

export type BreakpointType = "desktop" | "tablet" | "mobile";

export type SelectedElementData = {
  html: string;
  tagName: string;
  classes: string[];
  dataAttributes: Record<string, string>;
  styles?: Record<string, string>;
  filePath?: string;
};

interface ComponentContextType {
  isCanvas: boolean;
  setCanvas: (value: boolean) => void;
  isLoading: boolean;
  setCompletion: (value: string) => void;
  selectedVersion: number | undefined;
  setSelectedVersion: (value: number | undefined) => void;
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
  previousArtifactFiles: ChatFile[];
  setPreviousArtifactFiles: (files: ChatFile[]) => void;
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
  customDomain: CustomDomainData | null;
  subscription: Tables<"subscriptions"> | null;
  githubConnection: Tables<"github_connections"> | null;
  breakpoint: BreakpointType;
  setBreakpoint: (value: BreakpointType) => void;
  previewPath: string;
  navigatePreview: (path: string, options?: { pushHistory?: boolean }) => void;
  addressBarValue: string;
  setAddressBarValue: (value: string) => void;
  setPreviewPath: (value: string) => void;
  syncPreviewPath: (path: string, options?: { pushHistory?: boolean }) => void;
  isScrapingWebsite: boolean;
  setIsScrapingWebsite: (value: boolean) => void;
  isContinuingFromLengthError: boolean;
  setIsContinuingFromLengthError: (value: boolean) => void;
  isStreamingComplete: boolean;
  isResuming: boolean;
  connectedUser?: { id: string } | null;
  isElementSelectionActive: boolean;
  setElementSelectionActive: (value: boolean) => void;
  selectedElement: SelectedElementData | null;
  setSelectedElement: (element: SelectedElementData | null) => void;
  clearSelectedElement: () => void;
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
