import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, useState, useRef } from "react";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tables } from "@/types_db";
import {
  extractContent,
  hasArtifacts,
  handleAIcompletionForHTML,
  splitContentIntoChunks,
} from "@/utils/completion-parser";
import { maxPromptLength } from "@/utils/config";

import ComponentFiles from "./component-files";

interface Props {
  user: Tables<"users"> | null;
  selectedVersion: number | null;
  completion: string;
  messages: (Tables<"messages"> & {
    chats: Tables<"chats"> & {
      user: Tables<"users">;
    };
  })[];
  handleVersionSelect: (id: number) => void;
  handleDeleteVersion: (messageId: number) => void;
  handleSubmitToAI: (
    e: React.FormEvent<HTMLFormElement>,
    input: string,
  ) => void;
  authorized: boolean;
  isLoading: boolean;
}

export default function ComponentSidebar({
  completion,
  selectedVersion,
  messages,
  user,
  handleVersionSelect,
  handleDeleteVersion,
  handleSubmitToAI,
  authorized,
  isLoading,
}: Props) {
  const [input, setInput] = useState<string>("");
  const [userScrolled, setUserScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom =
        Math.abs(
          container.scrollHeight - container.scrollTop - container.clientHeight,
        ) < 10;

      if (!isAtBottom) {
        setUserScrolled(true);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container && !userScrolled) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, completion]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmitToAI(e, input);
    setInput("");
  };
  console.log(messages);

  return (
    <div
      className="relative hidden size-full overflow-hidden rounded-md border bg-secondary xl:block"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="relative size-full">
        <div
          ref={containerRef}
          className="flex size-full flex-col overflow-y-auto scroll-smooth pb-12"
        >
          {messages.map((m) => (
            <ComponentFiles
              key={m.id}
              completion={m.content}
              role={m.role}
              user={m.chats.user}
            />
          ))}
          {isLoading && completion && (
            <ComponentFiles
              completion={completion}
              role="assistant"
              user={user}
            />
          )}
        </div>

        <form
          className="absolute inset-x-0 bottom-0 flex w-full items-center"
          onSubmit={(e) => handleSubmit(e)}
        >
          {authorized && (
            <div className="flex w-full space-x-4 rounded-b-md border-t bg-background p-2">
              <Input
                autoFocus
                disabled={isLoading}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                minLength={2}
                maxLength={maxPromptLength}
                placeholder="Add a button, modify a div..."
                required
              />
              <Button loading={isLoading} type="submit">
                Iterate
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
