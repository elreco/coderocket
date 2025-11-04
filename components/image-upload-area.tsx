"use client";

import { Upload, FileUp, Loader2, Crown } from "lucide-react";
import { memo, useCallback, useState } from "react";

import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";

import { Button } from "./ui/button";

interface ImageUploadAreaProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  disabled: boolean;
  handleButtonClick: () => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop?: (files: File[]) => void;
  isReverse?: boolean;
  isUploading?: boolean;
  acceptedTypes?: string;
  label?: string;
  subscription?:
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null;
  isLoggedIn?: boolean;
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
    label = "File",
    subscription = null,
    isLoggedIn = true,
  }: ImageUploadAreaProps) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const isPremium = !!subscription;

    const handleClick = () => {
      if (!isLoggedIn) {
        toast({
          title: "Login required",
          description: "Sign in to upload files and streamline your workflow!",
          action: (
            <a
              href="/login"
              className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              Login
            </a>
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
              className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
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
              <a
                href="/login"
                className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
              >
                Login
              </a>
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
                className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
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
      [disabled, onDrop, fileInputRef, isLoggedIn, isPremium],
    );

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
        >
          <Button
            variant={isReverse ? "background" : "secondary"}
            className={cn(
              "w-full transition-all duration-200 lg:w-auto",
              isDragOver &&
                !disabled &&
                isLoggedIn &&
                isPremium &&
                "scale-105 border-2 border-dashed border-primary shadow-lg",
            )}
            size="sm"
            type="button"
            disabled={disabled || isUploading}
            onClick={handleClick}
            title={
              !isLoggedIn
                ? "Login to upload files"
                : !isPremium
                  ? "Upgrade to Premium to upload files"
                  : "Upload, paste, or drag & drop files (images or PDF)"
            }
          >
            {isUploading ? (
              <>
                <Loader2 className="size-3 shrink-0 animate-spin" />
                <span className="hidden sm:inline">Loading...</span>
              </>
            ) : isDragOver ? (
              <>
                <Upload className="size-3 shrink-0" />
                <span className="hidden sm:inline">Drop file</span>
              </>
            ) : (
              <>
                <FileUp className="size-3 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                {(!isLoggedIn || !isPremium) && (
                  <Crown className="size-3 shrink-0 text-amber-500" />
                )}
              </>
            )}
          </Button>
        </div>
      </>
    );
  },
);

ImageUploadArea.displayName = "ImageUploadArea";
