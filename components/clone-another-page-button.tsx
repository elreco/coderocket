"use client";

import { Globe, Loader2 } from "lucide-react";
import { useState } from "react";

import { toast } from "@/hooks/use-toast";
import { isSameDomain } from "@/utils/domain-helper";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";

interface CloneAnotherPageButtonProps {
  originalUrl: string;
  disabled?: boolean;
  onSubmit: (url: string) => void;
}

export function CloneAnotherPageButton({
  originalUrl,
  disabled = false,
  onSubmit,
}: CloneAnotherPageButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPageUrl, setNewPageUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);

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

    setIsOpen(false);
    setNewPageUrl("");
    setIsValidating(false);
    onSubmit(urlToUse);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          className="h-9 gap-2 font-normal"
        >
          <Globe className="size-4" />
          Clone Another Page
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Another Page</DialogTitle>
          <DialogDescription>
            Enter the URL of another page from the same website to clone. The
            domain must match: <strong>{new URL(originalUrl).hostname}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
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
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setNewPageUrl("");
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
  );
}
