"use client";

import {
  CircleFadingArrowUp,
  Database,
  Loader2,
  Paintbrush,
  RefreshCw,
  WandSparkles,
} from "lucide-react";
import { RefObject } from "react";

import { CloneAnotherPageButton } from "@/components/clone-another-page-button";
import { FigmaImportButton } from "@/components/figma-import-button";
import { FileBadge } from "@/components/file-badge";
import { ImageUploadArea } from "@/components/image-upload-area";
import { SelectedElementDisplay } from "@/components/selected-element-display";
import { TextareaWithLimit } from "@/components/textarea-with-limit";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import { createContinuePrompt } from "@/utils/completion-parser";
import { Framework, FREE_CHAR_LIMIT, maxImagesUpload } from "@/utils/config";
import { validateFile } from "@/utils/file-helper";

import ComponentTheme from "../(settings)/component-theme";

interface BuildError {
  errors?: string[];
}

interface SelectedElement {
  html: string;
  tagName: string;
  classes: string[];
  dataAttributes: Record<string, string>;
  styles?: Record<string, string>;
  filePath?: string;
}

interface ChatInputFormProps {
  authorized: boolean;
  isLoading: boolean;
  isLengthError: boolean;
  isWebcontainerReady: boolean;
  hasAssistantMessage: boolean;
  hasUnexecutedMigration: boolean;
  input: string;
  setInput: (value: string) => void;
  setInputIsValid: (value: boolean) => void;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  messages: Tables<"messages">[];
  selectedFramework: Framework;
  fetchedChat: Tables<"chats"> | null;
  subscription:
    | (Tables<"subscriptions"> & { prices: Partial<Tables<"prices">> | null })
    | null;
  isLoadingSubscription: boolean;
  isLoggedIn: boolean;
  buildError: BuildError | null;
  loadingState: string | null;
  selectedElement: SelectedElement | null;
  hasImproved: boolean;
  isImprovingLoading: boolean;
  inputRef: RefObject<HTMLTextAreaElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  handleSubmit: (e: React.FormEvent) => void;
  handleImprovePrompt: () => void;
  handleButtonClick: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileRemove: (index: number) => void;
  submitPrompt: (prompt: string) => void;
  handleSubmitToAI: (prompt: string) => void;
  setIsContinuingFromLengthError: (value: boolean) => void;
  setIsCloneAnotherPageActive: (value: boolean) => void;
  setCurrentCloneUrl: (url: string | null) => void;
  setIsScrapingWebsite: (value: boolean) => void;
  clearSelectedElement: () => void;
  setPendingClonePage: (data: { url: string; context?: string } | null) => void;
}

export function ChatInputForm({
  authorized,
  isLoading,
  isLengthError,
  isWebcontainerReady,
  hasAssistantMessage,
  hasUnexecutedMigration,
  input,
  setInput,
  setInputIsValid,
  files,
  setFiles,
  messages,
  selectedFramework,
  fetchedChat,
  subscription,
  isLoadingSubscription,
  isLoggedIn,
  buildError,
  loadingState,
  selectedElement,
  hasImproved,
  isImprovingLoading,
  inputRef,
  fileInputRef,
  handleSubmit,
  handleImprovePrompt,
  handleButtonClick,
  handleFileChange,
  handleFileRemove,
  submitPrompt,
  handleSubmitToAI,
  setIsContinuingFromLengthError,
  setIsCloneAnotherPageActive,
  setCurrentCloneUrl,
  setIsScrapingWebsite,
  clearSelectedElement,
  setPendingClonePage,
}: ChatInputFormProps) {
  const handleFileDrop = (droppedFiles: File[]) => {
    const validFiles: File[] = [];

    for (const file of droppedFiles) {
      if (files.length + validFiles.length >= maxImagesUpload) {
        toast({
          variant: "destructive",
          title: "Too many files",
          description: `Maximum ${maxImagesUpload} files allowed`,
          duration: 4000,
        });
        break;
      }

      const validation = validateFile(file);
      if (!validation.valid) {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: validation.error,
          duration: 4000,
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleFileSelectFromLibrary = async (libraryFile: {
    path: string;
    publicUrl: string;
    mimeType: string;
  }) => {
    try {
      const response = await fetch(libraryFile.publicUrl);
      const blob = await response.blob();
      const fileName = libraryFile.path.split("/").pop() || libraryFile.path;
      const file = new File([blob], fileName, {
        type: libraryFile.mimeType,
      });
      (file as File & { __libraryPath?: string }).__libraryPath =
        libraryFile.path;

      if (files.length >= maxImagesUpload) {
        toast({
          variant: "destructive",
          title: "Too many files",
          description: `Maximum ${maxImagesUpload} files allowed`,
          duration: 4000,
        });
        return;
      }

      const validation = validateFile(file);
      if (!validation.valid) {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: validation.error,
          duration: 4000,
        });
        return;
      }

      setFiles((prev) => [...prev, file]);
    } catch (error) {
      console.error("Error loading file from library:", error);
      toast({
        variant: "destructive",
        title: "Error loading file",
        description: "Failed to load file from library",
        duration: 4000,
      });
    }
  };

  const handleFileDeleted = (deletedPath: string) => {
    setFiles((prev) =>
      prev.filter(
        (file) =>
          (file as File & { __libraryPath?: string }).__libraryPath !==
          deletedPath,
      ),
    );
  };

  const handleFileUpload = (uploadedFiles: File[]) => {
    const validFiles: File[] = [];

    for (const file of uploadedFiles) {
      if (files.length + validFiles.length >= maxImagesUpload) {
        toast({
          variant: "destructive",
          title: "Too many files",
          description: `Maximum ${maxImagesUpload} files allowed`,
          duration: 4000,
        });
        break;
      }

      const validation = validateFile(file);
      if (!validation.valid) {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: validation.error,
          duration: 4000,
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleCloneAnotherPage = (url: string, context?: string) => {
    setPendingClonePage({ url, context });
    setIsCloneAnotherPageActive(true);
    setCurrentCloneUrl(url);
    setIsScrapingWebsite(true);
    const displayPrompt = context || "";
    setInput(displayPrompt);
    submitPrompt(displayPrompt);
  };

  if (!authorized) return null;

  return (
    <form
      className="flex w-full items-center"
      onSubmit={(e) => handleSubmit(e)}
    >
      <div className="bg-background flex w-full flex-col">
        <div className="flex w-full items-center justify-between space-x-1 px-2 pt-2">
          <div className="flex items-center gap-2">
            {!isLoading && isLengthError && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      className="mr-2"
                      onClick={() => {
                        setIsContinuingFromLengthError(true);
                        const continuePrompt = createContinuePrompt(messages);
                        setInput(continuePrompt);
                        submitPrompt(continuePrompt);
                      }}
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Continue generation</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {!isLoading && loadingState === "error" && buildError && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      className="mr-2"
                      onClick={() => {
                        const errorContent =
                          buildError.errors?.join("\n\n") || "";
                        const truncatedContent =
                          errorContent.length > FREE_CHAR_LIMIT
                            ? errorContent.substring(0, FREE_CHAR_LIMIT)
                            : errorContent;
                        const continuePrompt =
                          "Fix the following error: " + truncatedContent;
                        setInput(continuePrompt);
                        handleSubmitToAI(continuePrompt);
                      }}
                    >
                      <WandSparkles className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fix errors</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {!isLoading && hasUnexecutedMigration && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      className="mr-2"
                      onClick={() => {
                        const migrationSection = document.querySelector(
                          "[data-migration-runner]",
                        );
                        if (migrationSection) {
                          migrationSection.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }
                      }}
                    >
                      <Database className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Run Migration</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {selectedFramework === Framework.HTML && !isLengthError && (
              <div className="text-sm font-semibold">
                <ComponentTheme>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="flex items-center"
                          disabled={isLoading}
                        >
                          <Paintbrush className="size-4 shrink-0" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Theme</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </ComponentTheme>
              </div>
            )}
            {!isLoadingSubscription &&
              !(
                buildError &&
                buildError.errors &&
                buildError.errors.length > 0
              ) && (
                <>
                  <ImageUploadArea
                    fileInputRef={fileInputRef}
                    disabled={
                      isLoading ||
                      isLengthError ||
                      !!buildError ||
                      files.length >= maxImagesUpload ||
                      loadingState === "processing"
                    }
                    handleButtonClick={handleButtonClick}
                    handleImageChange={handleFileChange}
                    onDrop={handleFileDrop}
                    subscription={subscription}
                    isLoggedIn={isLoggedIn}
                    currentFilesCount={files.length}
                    onFileSelectFromLibrary={handleFileSelectFromLibrary}
                    onFileDeleted={handleFileDeleted}
                    onFileUpload={handleFileUpload}
                  />
                  <FigmaImportButton
                    disabled={
                      isLoading ||
                      isLengthError ||
                      !!buildError ||
                      loadingState === "processing"
                    }
                    framework={selectedFramework}
                    subscription={subscription}
                    isLoggedIn={isLoggedIn}
                    onFileImport={(file) => {
                      setFiles((prev) => [...prev, file]);
                    }}
                  />
                  {fetchedChat?.clone_url && (
                    <CloneAnotherPageButton
                      originalUrl={fetchedChat.clone_url}
                      disabled={
                        isLoading ||
                        isLengthError ||
                        !!buildError ||
                        loadingState === "processing"
                      }
                      onSubmit={handleCloneAnotherPage}
                    />
                  )}
                </>
              )}
          </div>
        </div>
        {!isLoading && files.length > 0 && (
          <div className="flex gap-2 overflow-x-auto p-2">
            {files.map((file, index) => (
              <FileBadge
                key={`${file.name}-${index}`}
                file={file}
                onRemove={() => handleFileRemove(index)}
                disabled={isLengthError || !!buildError}
              />
            ))}
          </div>
        )}
        {selectedElement && !isLoading && (
          <div className="m-2">
            <SelectedElementDisplay
              element={selectedElement}
              showClearButton={true}
              onClear={clearSelectedElement}
            />
          </div>
        )}
        <div className="flex w-full flex-col items-start space-y-1 p-2">
          <TextareaWithLimit
            ref={inputRef}
            autoFocus
            disabled={
              isLoading ||
              isLengthError ||
              (!isWebcontainerReady && hasAssistantMessage)
            }
            isLoading={isLoading}
            value={input}
            onChange={(value, isValid) => {
              setInput(value);
              setInputIsValid(isValid);
            }}
            displayMessage={false}
            subscription={subscription}
            isLoadingSubscription={isLoadingSubscription}
            isLoggedIn={isLoggedIn}
            showCounter={true}
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
            className="bg-background max-h-[400px] min-h-[76px] border-none pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div
            className={cn(
              "text-foreground my-0.5 text-xs transition-opacity",
              input.length <= 3 && "opacity-0",
            )}
          >
            Use <kbd className="bg-secondary rounded-md p-1">Shift</kbd> +{" "}
            <kbd className="bg-secondary rounded-md p-1">Return</kbd> for a new
            line
          </div>
          <div className="flex w-full items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="hover:bg-background size-9 p-0"
                    disabled={isLoading || isImprovingLoading || hasImproved}
                    onClick={handleImprovePrompt}
                  >
                    {isImprovingLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <WandSparkles
                        className={cn("size-4", hasImproved && "text-primary")}
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isImprovingLoading
                    ? "Improving prompt..."
                    : hasImproved
                      ? "Prompt improved"
                      : "Improve prompt"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              size="sm"
              loading={isLoading}
              disabled={
                isLoading ||
                (!isWebcontainerReady && hasAssistantMessage) ||
                isLengthError
              }
              type="submit"
              className="flex w-full items-center"
            >
              <CircleFadingArrowUp className="size-3" />
              <span>Iterate</span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
