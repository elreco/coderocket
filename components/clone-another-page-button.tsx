"use client";

import { Link2, Loader2 } from "lucide-react";
import { useState } from "react";

import { toast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";
import { isSameDomain } from "@/utils/domain-helper";

import { TextareaWithLimit } from "./textarea-with-limit";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface CloneAnotherPageButtonProps {
  originalUrl: string;
  disabled?: boolean;
  onSubmit: (url: string, context?: string) => void;
  subscription?:
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null;
  isLoggedIn?: boolean;
  isLoadingSubscription?: boolean;
}

export function CloneAnotherPageButton({
  originalUrl,
  disabled = false,
  onSubmit,
  subscription,
  isLoggedIn = false,
  isLoadingSubscription = false,
}: CloneAnotherPageButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPageUrl, setNewPageUrl] = useState("");
  const [userContext, setUserContext] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [contextIsValid, setContextIsValid] = useState(true);

  const handleSubmit = () => {
    setIsValidating(true);

    let urlToUse = newPageUrl.trim();
    if (!urlToUse) {
      toast({
        variant: "destructive",
        title: "URL required",
        description: "Please enter a URL to clone.",
        duration: 4000,
      });
      setIsValidating(false);
      return;
    }

    if (!/^https?:\/\//i.test(urlToUse)) {
      urlToUse = "https://" + urlToUse;
    }

    try {
      new URL(urlToUse);
    } catch {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description:
          "Please enter a valid website URL (e.g., https://netflix.com).",
        duration: 4000,
      });
      setIsValidating(false);
      return;
    }

    if (!isSameDomain(originalUrl, urlToUse)) {
      toast({
        variant: "destructive",
        title: "Different domain",
        description:
          "You can only clone pages from the same domain as the original website.",
        duration: 4000,
      });
      setIsValidating(false);
      return;
    }

    if (!contextIsValid) {
      toast({
        variant: "destructive",
        title: "Context is too long",
        description: `Your context exceeds the character limit. Please shorten it to continue.`,
        duration: 4000,
      });
      setIsValidating(false);
      return;
    }

    setIsOpen(false);
    setNewPageUrl("");
    setUserContext("");
    setIsValidating(false);
    onSubmit(urlToUse, userContext.trim() || undefined);
  };

  const handleOpenDialog = () => {
    setIsOpen(true);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              className="w-full transition-all duration-200 lg:w-auto"
              size="sm"
              type="button"
              disabled={disabled}
              onClick={handleOpenDialog}
            >
              <Link2 className="size-3 shrink-0 text-blue-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clone another page</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Another Page</DialogTitle>
            <DialogDescription>
              Enter the URL of another page from the same website to clone. The
              domain must match:{" "}
              <strong>{new URL(originalUrl).hostname}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clone-url">Page URL</Label>
              <Input
                id="clone-url"
                placeholder="https://example.com/about"
                value={newPageUrl}
                onChange={(e) => setNewPageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={isValidating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clone-context">
                Context{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              {subscription !== undefined && isLoggedIn !== undefined ? (
                <TextareaWithLimit
                  id="clone-context"
                  placeholder="Add instructions for this page clone (e.g., focus on the pricing section, use a dark theme...)"
                  value={userContext}
                  onChange={(value, isValid) => {
                    setUserContext(value);
                    setContextIsValid(isValid);
                  }}
                  disabled={isValidating}
                  showCounter={true}
                  isLoggedIn={isLoggedIn}
                  isLoading={isValidating}
                  subscription={subscription}
                  isLoadingSubscription={isLoadingSubscription}
                  className="min-h-[80px] resize-none"
                />
              ) : (
                <Textarea
                  id="clone-context"
                  placeholder="Add instructions for this page clone (e.g., focus on the pricing section, use a dark theme...)"
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  disabled={isValidating}
                  className="min-h-[80px] resize-none"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setNewPageUrl("");
                setUserContext("");
              }}
              disabled={isValidating}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isValidating}>
              {isValidating && <Loader2 className="size-4 animate-spin" />}
              Clone Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
