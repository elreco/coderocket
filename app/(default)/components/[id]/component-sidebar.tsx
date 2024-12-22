import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

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
  selectedVersion: number | null;
  completion: string;
  messages: Tables<"messages">[];
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
  handleVersionSelect,
  handleDeleteVersion,
  handleSubmitToAI,
  authorized,
  isLoading,
}: Props) {
  const [input, setInput] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmitToAI(e, input);
    setInput("");
  };

  useEffect(() => {
    console.log("🔥 completion", completion);
  }, [completion]);

  return (
    <div
      className="relative hidden h-full w-[520px] rounded-md border bg-secondary xl:block"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="relative size-full">
        <div className="flex size-full flex-col overflow-y-auto pb-12">
          {messages.map((m) => (
            <div key={m.id} className="flex px-2 py-6 sm:px-4">
              <Avatar className="mr-2 size-8 rounded-none">
                <AvatarImage src="/logo-white.png" />
                <AvatarFallback>T</AvatarFallback>
              </Avatar>

              <div className="flex w-full flex-col gap-4">
                {splitContentIntoChunks(m.content).map((chunk, index) => (
                  <div key={index}>
                    {chunk.type === "text" && (
                      <div className="whitespace-pre-wrap text-sm">
                        {chunk.content}
                      </div>
                    )}
                    {chunk.type === "artifact" && (
                      <ComponentFiles completion={chunk.content} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {isLoading && completion && (
            <div className="flex w-full flex-col gap-4">
              {splitContentIntoChunks(completion).map((chunk, index) => (
                <div key={index}>
                  {chunk.type === "text" && (
                    <div className="whitespace-pre-wrap text-sm">
                      {chunk.content}
                    </div>
                  )}
                  {chunk.type === "artifact" && (
                    <ComponentFiles completion={chunk.content} />
                  )}
                </div>
              ))}
            </div>
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
