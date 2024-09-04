import { Square3Stack3DIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useRef, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer";

import { ChatMessage } from "../types";

interface Props {
  selectedVersion: number | null;
  assistantMessages: ChatMessage[];
  messages: ChatMessage[];
  handleVersionSelect: (id: number) => void;
  isLoading: boolean;
}

export default function ChatSidebar({
  selectedVersion,
  assistantMessages,
  messages,
  handleVersionSelect,
  isLoading,
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
          <Button disabled={isLoading} variant="outline" className="mr-1">
            <Square3Stack3DIcon className="w-5" />
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
                </DrawerClose>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
