import {
  ArrowLeft,
  ArrowRight,
  Crosshair,
  ExternalLink,
  Fullscreen,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { FormEvent, RefObject } from "react";

import RenderHtmlComponent from "@/components/renders/render-html-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useComponentContext,
  WebcontainerLoadingState,
} from "@/context/component-context";
import { cn } from "@/lib/utils";

interface PreviewToolbarProps {
  isHtmlFrameworkSelected: boolean;
  sharePathSuffix: string;
  previewPathSuffix: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isNavigationEnabled: boolean;
  navigationPlaceholder: string;
  addressFocused: boolean;
  addressInputRef: RefObject<HTMLInputElement>;
  isModalOpen: boolean;
  loadingState: WebcontainerLoadingState;
  onSetAddressFocused: (focused: boolean) => void;
  onHandleGoBack: () => void;
  onHandleGoForward: () => void;
  onHandleAddressSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSetIframeKey: (updater: (prev: number) => number) => void;
  onSetIsModalOpen: (open: boolean) => void;
  onHandleFullscreenToggle: (open: boolean) => void;
}

export function PreviewToolbar({
  isHtmlFrameworkSelected,
  sharePathSuffix,
  previewPathSuffix,
  canGoBack,
  canGoForward,
  isNavigationEnabled,
  navigationPlaceholder,
  addressFocused,
  addressInputRef,
  isModalOpen,
  loadingState,
  onSetAddressFocused,
  onHandleGoBack,
  onHandleGoForward,
  onHandleAddressSubmit,
  onSetIframeKey,
  onSetIsModalOpen,
  onHandleFullscreenToggle,
}: PreviewToolbarProps) {
  const {
    isLoading,
    isLengthError,
    isWebcontainerReady,
    selectedVersion,
    chatId,
    authorized,
    isElementSelectionActive,
    setElementSelectionActive,
    breakpoint,
    setBreakpoint,
    addressBarValue,
    setAddressBarValue,
    setPreviewPath,
    previewPath,
    navigatePreview,
    syncPreviewPath,
    artifactFiles,
    iframeKey,
  } = useComponentContext();

  const isDisabled =
    isLoading ||
    isLengthError ||
    !isWebcontainerReady ||
    loadingState === "processing" ||
    loadingState === "starting" ||
    loadingState === "error";

  return (
    <div className="border-border bg-secondary flex items-center gap-2 overflow-x-auto border-t p-2">
      <div className="flex shrink-0 items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetIsModalOpen(true)}
              className="flex items-center"
              disabled={isDisabled}
            >
              <Fullscreen className="w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLengthError ? (
              <p>The component has an error</p>
            ) : (
              <p>Display in fullscreen</p>
            )}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isLengthError) {
                  return;
                }
                const url = isHtmlFrameworkSelected
                  ? `https://www.coderocket.app/content/${chatId}/${selectedVersion}`
                  : `https://${chatId}-${selectedVersion}.preview.coderocket.app${sharePathSuffix}`;
                window.open(url, "_blank");
              }}
              className="flex items-center"
              disabled={isLoading || isLengthError || !isWebcontainerReady}
            >
              <ExternalLink className="w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isLengthError
                ? "The component has an error"
                : "Open in a new tab"}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="border-border bg-background flex min-w-0 flex-1 items-center gap-2 rounded-md border p-0">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="size-8 shrink-0"
          onClick={onHandleGoBack}
          disabled={!canGoBack || !isNavigationEnabled}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="size-8 shrink-0"
          onClick={onHandleGoForward}
          disabled={!canGoForward || !isNavigationEnabled}
        >
          <ArrowRight className="size-4" />
        </Button>
        <form onSubmit={onHandleAddressSubmit} className="min-w-0 flex-1">
          <Input
            ref={addressInputRef}
            value={addressBarValue}
            onChange={(event) => setAddressBarValue(event.target.value)}
            onFocus={() => onSetAddressFocused(true)}
            onBlur={() => onSetAddressFocused(false)}
            disabled={!isNavigationEnabled}
            placeholder={navigationPlaceholder}
            className={cn(
              "h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0",
              !addressFocused && "text-muted-foreground",
            )}
          />
        </form>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="size-8 shrink-0"
              onClick={() => {
                setPreviewPath(addressBarValue);
                onSetIframeKey((prev) => prev + 1);
              }}
              disabled={isDisabled}
            >
              <RefreshCw className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reload preview</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="border-border bg-background flex shrink-0 items-center rounded-md border">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBreakpoint("desktop")}
              className={cn(
                "h-8 rounded-r-none px-2",
                breakpoint === "desktop" && "bg-secondary",
              )}
              disabled={isDisabled}
            >
              <Monitor className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Desktop</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBreakpoint("tablet")}
              className={cn(
                "h-8 rounded-none px-2",
                breakpoint === "tablet" && "bg-secondary",
              )}
              disabled={isDisabled}
            >
              <Tablet className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tablet</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBreakpoint("mobile")}
              className={cn(
                "h-8 rounded-l-none px-2",
                breakpoint === "mobile" && "bg-secondary",
              )}
              disabled={isDisabled}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mobile</p>
          </TooltipContent>
        </Tooltip>
      </div>
      {authorized && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setElementSelectionActive(!isElementSelectionActive)
              }
              className={cn(
                "relative flex h-8 items-center gap-1.5 px-2",
                isElementSelectionActive &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 border-primary",
              )}
              disabled={isDisabled}
            >
              <Crosshair className="h-4 w-4" />
              {!isElementSelectionActive && (
                <Badge
                  variant="default"
                  className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                >
                  New
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isElementSelectionActive
                ? "Disable element selection"
                : "Enable element selection"}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
      <Dialog open={isModalOpen} onOpenChange={onHandleFullscreenToggle}>
        <DialogContent className="z-9999 h-full w-full max-w-full! rounded-none p-10">
          <DialogTitle className="hidden">Fullscreen</DialogTitle>
          <DialogDescription
            className={cn(
              "z-50 flex items-center justify-center",
              breakpoint === "tablet" && "bg-muted",
              breakpoint === "mobile" && "bg-muted",
            )}
          >
            <div
              className={cn(
                "relative transition-all duration-300",
                breakpoint === "desktop" && "size-full",
                breakpoint === "tablet" &&
                  "w-[768px] h-[1024px] max-w-full max-h-full shadow-2xl",
                breakpoint === "mobile" &&
                  "w-[375px] h-[667px] max-w-full max-h-full shadow-2xl",
              )}
            >
              {!isHtmlFrameworkSelected && isWebcontainerReady ? (
                <iframe
                  key={iframeKey}
                  className="size-full rounded-md border-none"
                  src={`https://${chatId}-${selectedVersion}.webcontainer.coderocket.app${previewPathSuffix}`}
                  loading="eager"
                />
              ) : (
                <RenderHtmlComponent
                  key={iframeKey}
                  files={artifactFiles}
                  navigationTarget={previewPath}
                  onNavigation={(path) => navigatePreview(path)}
                  onRouteChange={(path) => syncPreviewPath(path)}
                />
              )}
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}
