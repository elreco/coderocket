import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { X } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/types_db";

interface Props {
  selectedVersion: number | null;
  assistantMessages: Tables<"messages">[];
  messages: Tables<"messages">[];
  handleVersionSelect: (id: number) => void;
  handleDeleteVersion: (messageId: number) => void;
  authorized: boolean;
  isLoading: boolean;
}

export default function ComponentSidebar({
  selectedVersion,
  assistantMessages,
  messages,
  handleVersionSelect,
  handleDeleteVersion,
  authorized,
  isLoading,
}: Props) {
  const getUserMessage = (version: number) => {
    const selectedMessages = messages.filter((m) => m.version === version);
    if (selectedMessages.length === 2) {
      const userMessage = selectedMessages.find((m) => m.role === "user");
      if (userMessage) {
        return userMessage.content?.toString()?.substring(0, 200);
      }
    }
    return "No user message found.";
  };

  return (
    <div
      className="hidden size-full space-y-3 overflow-auto pb-2 xl:block"
      style={{ scrollbarWidth: "none" }}
    >
      {assistantMessages.map((m) => (
        <div key={m.id} className="relative">
          <img
            alt=""
            src={m?.screenshot || ""}
            className="aspect-video w-full rounded-md border object-cover"
          />
          <Tooltip>
            <TooltipTrigger
              className={clsx(
                "absolute inset-0 z-10 flex cursor-pointer select-none items-center justify-center rounded-md transition-all duration-300",
                selectedVersion === m.version
                  ? "bg-transparent"
                  : "bg-black/40 hover:bg-transparent",
                isLoading && "cursor-not-allowed",
              )}
              onClick={() => {
                if (!isLoading) {
                  handleVersionSelect(m.version);
                }
              }}
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
              <p className="text-sm text-white">{getUserMessage(m.version)}</p>
            </TooltipContent>
          </Tooltip>
          {assistantMessages.length > 1 && authorized && (
            <AlertDialog>
              <AlertDialogTrigger className="absolute right-3 top-2 z-20 cursor-pointer">
                <X className="size-6 fill-red-500 font-bold hover:fill-red-300" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Version</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this version?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteVersion(m.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ))}
    </div>
  );
}
