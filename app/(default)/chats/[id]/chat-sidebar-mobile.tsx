import clsx from "clsx";
import { Layers, XCircle } from "lucide-react";
import { useRef, useEffect } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer";

import { ChatProps, ChatMessage } from "../types";

interface Props {
  fetchedChat: ChatProps;
  selectedVersion: number | null;
  assistantMessages: ChatMessage[];
  messages: ChatMessage[];
  handleVersionSelect: (id: number) => void;
  handleDeleteVersion: (chatId: string, messageId: number) => void;
  isLoading: boolean;
  authorized: boolean;
}

export default function ChatSidebar({
  fetchedChat,
  selectedVersion,
  assistantMessages,
  messages,
  handleVersionSelect,
  handleDeleteVersion,
  isLoading,
  authorized,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="block xl:hidden">
      <Drawer>
        <DrawerTrigger asChild>
          <Button disabled={isLoading} variant="secondary" className="mr-1">
            <Layers className="w-5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="h-[90%] px-8">
          <div className="relative mb-3 flex size-full flex-col items-center gap-y-3 overflow-auto will-change-auto">
            {assistantMessages.map((m) => (
              <div key={m.id} className="relative">
                <img
                  alt=""
                  src={m?.screenshot || ""}
                  className={clsx(
                    "aspect-video w-full rounded-md border object-cover",
                    selectedVersion === m.id
                      ? "border-gray-900"
                      : "border-gray-200",
                  )}
                />
                <DrawerClose
                  className={clsx(
                    "absolute inset-0 z-10 size-full cursor-pointer select-none items-center justify-center rounded-md transition-all duration-300",
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
                  {messages.length > 2 && authorized && (
                    <AlertDialog>
                      <AlertDialogTrigger className="absolute right-3 top-2 z-20 cursor-pointer">
                        <XCircle className="size-4 cursor-pointer fill-red-500 hover:fill-red-400" />
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
                          <AlertDialogAction
                            onClick={() =>
                              handleDeleteVersion(fetchedChat.id, m.id)
                            }
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </DrawerClose>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
