"use client";

import { Upload, FileUp, Loader2, Crown } from "lucide-react";
import { memo, useCallback, useState } from "react";

import { useAuthModal } from "@/hooks/use-auth-modal";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";

import { FileLibraryModal } from "./file-library-modal";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ImageUploadAreaProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  disabled: boolean;
  handleButtonClick: () => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop?: (files: File[]) => void;
  isReverse?: boolean;
  isUploading?: boolean;
  acceptedTypes?: string;
  subscription?:
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null;
  isLoggedIn?: boolean;
  onFileSelectFromLibrary?: (file: {
    path: string;
    publicUrl: string;
    type: "image" | "pdf" | "text";
    mimeType: string;
    uploadDate: string;
    size: number;
    name: string;
  }) => void;
  currentFilesCount?: number;
  onFileUpload?: (files: File[]) => void;
  onFileDeleted?: (path: string) => void;
}

export const ImageUploadArea = memo(
  ({
    fileInputRef,
    disabled,
    handleButtonClick,
    handleImageChange,
    onDrop,
    isReverse = false,
    isUploading = false,
    acceptedTypes = ".png, .jpeg, .jpg, .gif, .webp, .pdf",
    subscription = null,
    isLoggedIn = true,
    onFileSelectFromLibrary,
    currentFilesCount = 0,
    onFileDeleted,
  }: ImageUploadAreaProps) => {
    const { openLogin } = useAuthModal();
    const [isDragOver, setIsDragOver] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const isPremium = !!subscription;

    const handleClick = () => {
      if (!isLoggedIn) {
        toast({
          title: "Login required",
          description: "Sign in to upload files and streamline your workflow!",
          action: (
            <button
              onClick={() => openLogin()}
              className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
            >
              Login
            </button>
          ),
          duration: 5000,
        });
        return;
      }

      if (!isPremium) {
        toast({
          title: "Premium feature",
          description:
            "Unlock file uploads and accelerate your development with AI-powered design imports!",
          action: (
            <a
              href="/pricing"
              className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
            >
              Upgrade
            </a>
          ),
          duration: 5000,
        });
        return;
      }

      handleButtonClick();
    };

    const handleDragEnter = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && isLoggedIn && isPremium) {
          setIsDragOver(true);
        }
      },
      [disabled, isLoggedIn, isPremium],
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (
        e.currentTarget === e.target ||
        !e.currentTarget.contains(e.relatedTarget as Node)
      ) {
        setIsDragOver(false);
      }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDropEvent = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (disabled) return;

        if (!isLoggedIn) {
          toast({
            title: "Login required",
            description:
              "Sign in to upload files and streamline your workflow!",
            action: (
              <button
                onClick={() => openLogin()}
                className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
              >
                Login
              </button>
            ),
            duration: 5000,
          });
          return;
        }

        if (!isPremium) {
          toast({
            title: "Premium feature",
            description:
              "Unlock file uploads and accelerate your development with AI-powered design imports!",
            action: (
              <a
                href="/pricing"
                className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
              >
                Upgrade
              </a>
            ),
            duration: 5000,
          });
          return;
        }

        const files = Array.from(e.dataTransfer.files);
        const validFiles = files.filter(
          (file) =>
            file.type.startsWith("image/") || file.type === "application/pdf",
        );

        if (validFiles.length > 0 && onDrop) {
          onDrop(validFiles);
        } else if (validFiles.length > 0 && fileInputRef.current) {
          const dataTransfer = new DataTransfer();
          validFiles.forEach((file) => dataTransfer.items.add(file));
          fileInputRef.current.files = dataTransfer.files;
          const event = new Event("change", { bubbles: true });
          fileInputRef.current.dispatchEvent(event);
        }
      },
      [disabled, onDrop, fileInputRef, isLoggedIn, isPremium, openLogin],
    );

    const handleLibraryClick = () => {
      if (!isLoggedIn) {
        toast({
          title: "Login required",
          description: "Sign in to access your file library!",
          action: (
            <button
              onClick={() => openLogin()}
              className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
            >
              Login
            </button>
          ),
          duration: 5000,
        });
        return;
      }

      if (!isPremium) {
        toast({
          title: "Premium feature",
          description:
            "Unlock file library and manage your uploaded files with Premium!",
          action: (
            <a
              href="/pricing"
              className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
            >
              Upgrade
            </a>
          ),
          duration: 5000,
        });
        return;
      }

      setIsLibraryOpen(true);
    };

    return (
      <>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept={acceptedTypes}
          multiple
          onChange={handleImageChange}
        />
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDropEvent}
          className="flex items-center gap-2"
        >
          {isLoggedIn && isPremium ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isReverse ? "background" : "secondary"}
                    className={cn(
                      "w-full transition-all duration-200 lg:w-auto",
                      isDragOver &&
                        !disabled &&
                        isLoggedIn &&
                        isPremium &&
                        "border-primary scale-105 border-2 border-dashed shadow-lg",
                    )}
                    size="sm"
                    type="button"
                    disabled={disabled || isUploading}
                    onClick={handleLibraryClick}
                  >
                    <FileUp className="size-3 shrink-0" />
                    {(!isLoggedIn || !isPremium) && (
                      <Crown className="size-3 shrink-0 text-amber-500" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open file library</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isReverse ? "background" : "secondary"}
                    className={cn(
                      "w-full transition-all duration-200 lg:w-auto",
                      isDragOver &&
                        !disabled &&
                        isLoggedIn &&
                        isPremium &&
                        "border-primary scale-105 border-2 border-dashed shadow-lg",
                    )}
                    size="sm"
                    type="button"
                    disabled={disabled || isUploading}
                    onClick={handleClick}
                  >
                    {isUploading ? (
                      <Loader2 className="size-3 shrink-0 animate-spin" />
                    ) : isDragOver ? (
                      <Upload className="size-3 shrink-0" />
                    ) : (
                      <>
                        <FileUp className="size-3 shrink-0" />
                        {(!isLoggedIn || !isPremium) && (
                          <Crown className="size-3 shrink-0 text-amber-500" />
                        )}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!isLoggedIn
                    ? "Login to upload files"
                    : !isPremium
                      ? "Upgrade to Premium to upload files"
                      : isUploading
                        ? "Loading..."
                        : isDragOver
                          ? "Drop file"
                          : "Upload, paste, or drag & drop files (images or PDF)"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {onFileSelectFromLibrary && (
          <FileLibraryModal
            open={isLibraryOpen}
            onOpenChange={setIsLibraryOpen}
            subscription={subscription}
            isLoggedIn={isLoggedIn}
            onFileSelect={onFileSelectFromLibrary}
            currentFilesCount={currentFilesCount}
            fileInputRef={fileInputRef}
            onFileDeleted={onFileDeleted}
          />
        )}
      </>
    );
  },
);

ImageUploadArea.displayName = "ImageUploadArea";
