export interface ContentChunk {
  type: "text" | "artifact" | "thinking";
  content: string;
}

export interface ChatFile {
  name: string | null;
  content: string;
  isDelete?: boolean;
  isActive: boolean;
  isIncomplete?: boolean;
  isContinue?: boolean;
  isLocked?: boolean;
  category?: "frontend" | "api" | "migration" | "type" | "config" | "env";
}

export interface CategorizedFiles {
  frontend: ChatFile[];
  api: ChatFile[];
  migrations: ChatFile[];
  types: ChatFile[];
  config: ChatFile[];
  env: ChatFile[];
}

export interface ChatMessage {
  id: string | number;
  role: "user" | "assistant" | "system";
  content: string;
  version: number;
  created_at: string;
  chats?: {
    user?: Record<string, unknown>;
    prompt_image?: string | null;
    remix_chat_id?: string | null;
  };
  ai_prompt?: string;
}
