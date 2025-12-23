import {
  Eye,
  Code as CodeIcon,
  GitFork,
  Heart,
  Layers,
  Loader,
  Rocket,
  Share,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComponentContext } from "@/context/component-context";
import { cn } from "@/lib/utils";
import type { CustomDomainData } from "@/types/custom-domain";

import ComponentSidebar from "../component-sidebar";

interface ComponentHeaderProps {
  title: string;
  isLiked: boolean;
  likesCount: number;
  isRemixing: boolean;
  customDomain: CustomDomainData | null;
  onShare: () => void;
  onRemixClick: () => void;
  onLikeClick: () => void;
  onShareModalOpen: () => void;
}

export function ComponentHeader({
  title,
  isLiked,
  likesCount,
  isRemixing,
  customDomain,
  onShare,
  onRemixClick,
  onLikeClick,
  onShareModalOpen,
}: ComponentHeaderProps) {
  const {
    isCanvas,
    setCanvas,
    isLoading,
    selectedVersion,
    fetchedChat,
    isLengthError,
    isVisible,
    connectedUser,
  } = useComponentContext();

  const isUserLoggedIn = !!connectedUser;

  return (
    <div className="relative flex h-auto flex-col items-center justify-start py-1.5 pr-2 xl:h-12 xl:flex-row xl:justify-between xl:pl-14">
      <h1 className="mb-2 flex max-w-full min-w-0 flex-1 items-center gap-2 font-medium lg:mb-0">
        {title || fetchedChat?.title || selectedVersion !== undefined ? (
          <>
            <p className="mx-10 max-w-full min-w-0 xl:mx-0">
              <span className="block truncate text-center first-letter:uppercase">
                {title || fetchedChat?.title || `Version #${selectedVersion}`}
              </span>
            </p>
            {fetchedChat?.is_deployed &&
              fetchedChat?.deploy_subdomain &&
              fetchedChat?.deployed_version !== undefined && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={`https://${
                        customDomain?.is_verified && customDomain?.domain
                          ? customDomain.domain
                          : `${fetchedChat.deploy_subdomain}.coderocket.app`
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-500/20 dark:text-green-400"
                    >
                      <Rocket className="size-3" />
                      <span className="hidden sm:inline">
                        Deployed v{fetchedChat.deployed_version}
                      </span>
                      <span className="sm:hidden">
                        v{fetchedChat.deployed_version}
                      </span>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Live at{" "}
                      {customDomain?.is_verified && customDomain?.domain
                        ? customDomain.domain
                        : `${fetchedChat.deploy_subdomain}.coderocket.app`}
                    </p>
                    <p className="text-xs">
                      Version #{fetchedChat.deployed_version}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
          </>
        ) : (
          <span className="flex items-center">
            <Loader className="mr-2 size-4 animate-spin" />
            Loading
          </span>
        )}
      </h1>
      <div className="ml-2 flex items-center gap-2">
        <Tabs
          value={isCanvas ? "canvas" : "code"}
          className="w-full"
          onValueChange={(value) => setCanvas(value === "canvas")}
        >
          <TabsList className="grid w-fit grid-cols-2 text-xs">
            <TabsTrigger
              value="canvas"
              className="flex items-center justify-center"
            >
              <Eye className="size-4 md:hidden" />
              <span className="hidden text-xs md:inline">Preview</span>
            </TabsTrigger>
            <TabsTrigger
              value="code"
              className="flex items-center justify-center"
            >
              <CodeIcon className="size-4 md:hidden" />
              <span className="hidden text-xs md:inline">Code</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (isLoading || isLengthError) {
                  return;
                }
                if (!isVisible) {
                  onShareModalOpen();
                  return;
                }
                onShare();
              }}
              disabled={isLoading || isLengthError}
              className="relative flex items-center gap-1.5"
            >
              <Share className="w-5" />
              <Badge
                variant="default"
                className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
              >
                New
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share</p>
          </TooltipContent>
        </Tooltip>
        {isUserLoggedIn && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (isRemixing || isLoading) {
                      return;
                    }
                    onRemixClick();
                  }}
                  disabled={isRemixing || isLoading}
                  className="flex items-center"
                >
                  <GitFork className="w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remix</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onLikeClick}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center gap-1",
                    isLiked && "text-primary",
                  )}
                >
                  <Heart
                    className={cn(
                      "w-5",
                      isLiked && "text-primary fill-primary",
                    )}
                    fill={isLiked ? "currentColor" : "none"}
                  />
                  {likesCount > 0 && (
                    <span
                      className={cn("font-medium", isLiked && "text-primary")}
                    >
                      {likesCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isLiked
                    ? "Remove from liked components"
                    : "Add to liked components"}
                </p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="secondary" className="block xl:hidden">
              <Layers className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="h-full p-0">
            <ComponentSidebar className="flex xl:hidden" />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
