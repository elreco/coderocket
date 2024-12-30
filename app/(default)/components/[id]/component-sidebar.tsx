import { CircleFadingArrowUp, Paintbrush } from "lucide-react";
import { useEffect, useState, useRef } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { maxPromptLength } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { getInitials } from "@/utils/helpers";

import ComponentTheme from "./(settings)/component-theme";
import { useComponentContext } from "./component-context";
import ComponentFiles from "./component-files";
import { ComponentSidebarSkeleton } from "./component-sidebar-skeleton";

export default function ComponentSidebar() {
  const {
    authorized,
    messages,
    isLoading,
    selectedVersion,
    user,
    handleSubmitToAI,
    input,
    setInput,
  } = useComponentContext();

  const [isLoaderVisible, setLoaderVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaderVisible(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current && messages.length > 0) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmitToAI(e, input);
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [isLoading, messages]);

  const isIterationVisible = selectedVersion !== null && selectedVersion > -1;

  return (
    <div
      className="relative size-full overflow-hidden rounded-md border bg-secondary"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="relative size-full">
        <div
          ref={containerRef}
          className={cn(
            "flex size-full flex-col overflow-y-auto scroll-smooth",
            authorized && "pb-24",
          )}
        >
          {isLoaderVisible && (
            <div className="absolute inset-0 z-10 flex size-full flex-col items-start bg-secondary p-4">
              <ComponentSidebarSkeleton />
            </div>
          )}
          {messages.map((m) => (
            <ComponentFiles message={m} key={m.id} />
          ))}
          <div
            className={cn(
              "flex flex-col px-2 py-6 sm:px-4",
              "transition-all duration-200",
              isLoading && messages.length > 1 ? "block" : "hidden",
            )}
          >
            <div className="flex items-center">
              <Avatar className="mr-2 size-8 rounded-lg">
                <AvatarImage
                  src={user?.avatar_url || ""}
                  alt={user?.full_name || ""}
                />
                <AvatarFallback className="border bg-background">
                  <span className="text-xs">
                    {getInitials(user?.full_name || "")}
                  </span>
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                {user?.full_name && (
                  <h2 className="text-lg font-semibold">{user.full_name}</h2>
                )}
                <p className="text-sm">{input}</p>
              </div>
            </div>
            <p className="mt-2 text-right text-xs font-semibold text-primary">
              {getRelativeDate(new Date().toISOString())}
            </p>
          </div>

          <div
            className={cn(
              "flex flex-col px-2 py-6 sm:px-4",
              "transition-all duration-200",
              isLoading ? "block" : "hidden",
            )}
          >
            <div className="flex items-start gap-2">
              <Avatar className="mr-2 size-8 rounded-none">
                <AvatarImage src="/logo-white.png" />
                <AvatarFallback>T</AvatarFallback>
              </Avatar>
              <p className="animate-pulse text-sm">Generating...</p>
            </div>
          </div>

          <form
            className="absolute inset-x-0 bottom-0 flex w-full items-center"
            onSubmit={(e) => handleSubmit(e)}
          >
            {authorized && (
              <div className="flex w-full flex-col rounded-b-md bg-background">
                <div className="flex w-full items-center justify-between border-t p-2">
                  <div className="whitespace-nowrap text-xs font-semibold">
                    {!isIterationVisible
                      ? "Generating first version"
                      : isLoading
                        ? "Iterating from "
                        : "Iterate from "}
                    {isIterationVisible && (
                      <span className="text-primary">
                        version #{selectedVersion}
                      </span>
                    )}
                  </div>

                  {authorized && (
                    <div className="text-sm font-semibold">
                      <ComponentTheme>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="flex items-center"
                          disabled={isLoading}
                        >
                          <Paintbrush className="size-4" />
                          <span className="ml-0.5">Theme</span>
                        </Button>
                      </ComponentTheme>
                    </div>
                  )}
                </div>
                <div className="flex w-full items-center space-x-1 border-t p-2">
                  <Input
                    autoFocus
                    disabled={isLoading}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    minLength={2}
                    maxLength={maxPromptLength}
                    placeholder="Add a button, modify a div..."
                    required
                    className="border-background focus-visible:ring-0"
                  />
                  <Button
                    size="sm"
                    loading={isLoading}
                    type="submit"
                    className="flex items-center"
                  >
                    <CircleFadingArrowUp className="size-3" />
                    <span>Iterate</span>
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
