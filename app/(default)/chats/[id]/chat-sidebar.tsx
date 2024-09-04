import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { useRef, useEffect } from "react";

import { Badge } from "@/components/ui/badge";

import { ChatMessage } from "../types";

interface Props {
  selectedVersion: string | null;
  assistantMessages: ChatMessage[];
  messages: ChatMessage[];
  handleVersionSelect: (id: string) => void;
}

export default function ChatSidebar({
  selectedVersion,
  assistantMessages,
  messages,
  handleVersionSelect,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getUserMessage = (assistantMessageId: string) => {
    const assistantIndex = messages.findIndex(
      (m) => m.id === assistantMessageId,
    );
    if (assistantIndex > 0) {
      for (let i = assistantIndex - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          return messages[i].content?.substring(0, 200);
        }
      }
    }
    return "No user message found.";
  };

  return (
    <div
      ref={scrollRef}
      className="hidden h-full w-1/12 space-y-3 overflow-auto pb-2 xl:block"
      style={{ scrollbarWidth: "none" }}
    >
      {assistantMessages.map((m) => (
        <div key={m.id} className="relative">
          <img
            alt=""
            src={m?.screenshot || ""}
            className="aspect-video w-full rounded-md border border-gray-300 object-cover"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                className={clsx(
                  "absolute inset-0 z-10 flex cursor-pointer select-none items-center justify-center rounded-md transition-all duration-300",
                  selectedVersion === m.id
                    ? "bg-transparent"
                    : "bg-black/40 hover:bg-transparent",
                )}
                onClick={() => handleVersionSelect(m.id)}
              >
                <Badge
                  className="absolute bottom-0 right-0 m-2"
                  variant="secondary"
                >
                  v{m.version}
                </Badge>
              </TooltipTrigger>

              <TooltipContent
                side="left"
                className="z-50 mr-2 flex w-64 flex-col space-y-2 rounded border-gray-700 bg-gray-900 p-3"
              >
                <img
                  alt=""
                  src={m?.screenshot || ""}
                  className="w-full rounded object-cover"
                />
                <p className="text-sm text-white">{getUserMessage(m.id)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ))}
    </div>
  );
}
