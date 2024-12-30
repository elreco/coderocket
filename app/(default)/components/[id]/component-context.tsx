import { createContext, useContext } from "react";

import { Tables } from "@/types_db";

type ChatMessage = Tables<"messages"> & {
  chats: {
    user: Tables<"users">;
    prompt_image: string | null;
  };
};

interface ComponentContextType {
  isCanvas: boolean;
  setCanvas: (value: boolean) => void;
  isLoading: boolean;
  setCompletion: (value: string) => void;
  selectedVersion: number;
  componentFiles: Array<{
    name: string | null;
    content: string;
  }>;
  activeTab: string;
  editorValue: string;
  handleVersionSelect: (version: number, tabName?: string) => void;
  authorized: boolean;
  handleSubmitToAI: (
    e: React.FormEvent<HTMLFormElement>,
    input: string,
  ) => void;
  completion: string;
  messages: ChatMessage[];
  user: Tables<"users"> | null;
  handleComponentFiles: (
    completion: string,
    isFirstRun?: boolean,
    tabName?: string,
  ) => void;
  refreshChatData: () => Promise<ChatMessage[] | undefined>;
  isVisible: boolean;
  setVisible: (value: boolean) => void;
  input: string;
  setInput: (value: string) => void;
  chatId: string;
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
