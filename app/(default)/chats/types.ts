/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionCall } from "ai";

export interface ChatMessage {
  id: string;
  createdAt?: Date;
  version?: number;
  content: string | null;
  screenshot: string | null;
  ui?: string | JSX.Element | JSX.Element[] | null | undefined;
  role: "system" | "user" | "assistant" | "function";
  name?: string;
  function_call?: string | FunctionCall;
}

export interface ChatProps {
  created_at: string | null;
  id: string;
  messages: ChatMessage[];
  image_url?: string | null;
  user_id: any;
}

export interface Chat {
  chat_id: string;
  image_url: string;
  user_id: string;
  user_full_name: string;
  first_user_message: any;
  last_assistant_message: any;
}
