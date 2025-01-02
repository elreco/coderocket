import { CircleFadingArrowUp, Paintbrush } from "lucide-react";
import { useEffect, useState, useRef } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitToAI(input);
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
    <div className="relative flex size-full flex-col overflow-hidden border-l-0 bg-secondary lg:border-l">
      <div
        ref={containerRef}
        className="flex size-full max-h-full flex-col overflow-y-auto scroll-smooth"
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
            <Avatar className="mr-2 size-10">
              <AvatarImage
                src={user?.avatar_url || ""}
                alt={user?.full_name || ""}
              />
              <AvatarFallback className="bg-background">
                <span className="text-xs">
                  {getInitials(user?.full_name || "")}
                </span>
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              {user?.full_name && (
                <h2 className="text-lg font-semibold">{user.full_name}</h2>
              )}
              <p className="text-sm first-letter:uppercase">{input}</p>
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
            <Avatar className="mr-2 size-10 rounded-none">
              <AvatarImage src="/logo-white.png" />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
            <p className="animate-pulse text-sm">Generating...</p>
          </div>
        </div>
      </div>
      <form
        className="flex w-full flex-1 items-center"
        onSubmit={(e) => handleSubmit(e)}
      >
        {authorized && (
          <div className="flex w-full flex-col bg-background">
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
            <div className="flex w-full flex-col items-start space-y-1 border-t p-2">
              <Textarea
                autoFocus
                disabled={isLoading}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                minLength={2}
                placeholder="Add a button, modify a div..."
                required
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    if (event.shiftKey) {
                      return;
                    }

                    event.preventDefault();

                    handleSubmit(event);
                  }
                }}
                className="max-h-[400px] min-h-[76px] border-none bg-background pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div
                className={cn(
                  "my-0.5 text-xs text-foreground transition-opacity",
                  input.length <= 3 && "opacity-0",
                )}
              >
                Use <kbd className="rounded-sm bg-secondary p-1">Shift</kbd> +{" "}
                <kbd className="rounded-sm bg-secondary p-1">Return</kbd> for a
                new line
              </div>
              <Button
                size="sm"
                loading={isLoading}
                type="submit"
                className="flex w-full items-center"
              >
                <CircleFadingArrowUp className="size-3" />
                <span>Iterate</span>
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
