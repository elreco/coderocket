import { FunctionCall } from "ai";

export interface ChatMessage {
  id: string;
  createdAt?: Date;
  version?: number;
  content: string | null;
  ui?: string | JSX.Element | JSX.Element[] | null | undefined;
  role: "system" | "user" | "assistant" | "function";
  name?: string;
  function_call?: string | FunctionCall;
}

export interface ChatProps {
  created_at: string | null;
  id: string;
  messages: ChatMessage[];
  user_id: string | null;
}
