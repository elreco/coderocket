import { Square3Stack3DIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useRef, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";

import { ChatMessage } from "../types";

interface Props {
  selectedVersion: string | null;
  assistantMessages: ChatMessage[];
  messages: ChatMessage[];
  handleVersionSelect: (id: string) => void;
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
        <DrawerTrigger disabled={isLoading}>
          <Button disabled={isLoading} variant="outline">
            <Square3Stack3DIcon className="w-5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="flex items-center space-y-3 overflow-auto p-8">
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
              <div
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
              </div>
            </div>
          ))}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
