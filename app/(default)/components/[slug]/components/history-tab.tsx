"use client";

import { ChevronsRight } from "lucide-react";
import { RefObject } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import { avatarApi } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

interface HistoryTabProps {
  messages: Tables<"messages">[];
  selectedVersion: number | undefined;
  isLoading: boolean;
  user: Tables<"users"> | null;
  currentVersionRef: RefObject<HTMLDivElement | null>;
  onVersionSelect: (version: number) => void;
}

export function HistoryTab({
  messages,
  selectedVersion,
  isLoading,
  user,
  currentVersionRef,
  onVersionSelect,
}: HistoryTabProps) {
  return (
    <div className="flex flex-col gap-2 p-3">
      {!isLoading &&
        messages
          .filter((m) => m.role === "user")
          .map((m) => (
            <TooltipProvider key={m.id}>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <div
                    ref={
                      m.version === selectedVersion ? currentVersionRef : null
                    }
                    onClick={() =>
                      m.version !== selectedVersion &&
                      onVersionSelect(m.version)
                    }
                    className={cn(
                      "border-primary/20 bg-primary/5 rounded-lg border p-2 transition-all",
                      m.version === selectedVersion
                        ? "border-primary/30 cursor-default"
                        : isLoading
                          ? "cursor-not-allowed opacity-70"
                          : "hover:border-primary/30 cursor-pointer",
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2 p-1">
                      <div className="flex w-full items-center gap-2">
                        <Avatar className="border-primary size-8 border">
                          <AvatarImage src={user?.avatar_url || undefined} />
                          <AvatarFallback>
                            <img
                              src={`${avatarApi}${user?.full_name}`}
                              alt="logo"
                              className="size-full"
                            />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            {user?.full_name}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Version #{m.version > -1 ? m.version : 0}
                          </span>
                        </div>
                      </div>
                      {m.version === selectedVersion ? (
                        <Badge className="rounded-full">Current</Badge>
                      ) : (
                        <ChevronsRight className="size-4" />
                      )}
                    </div>
                    <p className="mt-2 truncate text-sm">{m.content}</p>
                    <p className="text-muted-foreground mt-2 text-right text-xs">
                      {getRelativeDate(m.created_at)}
                    </p>
                  </div>
                </TooltipTrigger>
                {isLoading && (
                  <TooltipContent side="top">
                    <p>
                      Please wait for the component to load before changing
                      versions
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
    </div>
  );
}
