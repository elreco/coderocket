"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import {
  ExternalLink,
  Upload,
  AlertCircle,
  Download,
  Loader2,
  LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";

import { getSubscription } from "@/app/supabase-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useComponentContext } from "@/context/component-context";
import { useToast } from "@/hooks/use-toast";
import { Database, Tables } from "@/types_db";

import {
  createGithubRepo,
  syncComponentToGithub,
  getGithubConnectionForUser,
  pullFromGithub,
} from "../github-sync-actions";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"] & {
  prices: Database["public"]["Tables"]["prices"]["Row"] & {
    products: Database["public"]["Tables"]["products"]["Row"];
  };
};

interface AlertBoxProps {
  icon: LucideIcon;
  title: string;
  description: string;
  variant: "amber" | "orange" | "blue" | "emerald";
}

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  loadingLabel: string;
  isLoading: boolean;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

const COLORS = {
  amber: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    iconText: "text-amber-600",
    titleText: "text-amber-800",
    descText: "text-amber-700",
  },
  orange: {
    border: "border-orange-200",
    bg: "bg-orange-50",
    iconText: "text-orange-600",
    titleText: "text-orange-800",
    descText: "text-orange-700",
  },
  blue: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    iconText: "text-blue-600",
    titleText: "text-blue-800",
    descText: "text-blue-700",
  },
  emerald: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    iconText: "text-emerald-600",
    titleText: "text-emerald-800",
    descText: "text-emerald-700",
  },
};

function PageHeader() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Modify Code on GitHub</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Synchronize your component code with GitHub for local development.{" "}
        <a
          href="https://docs.coderocket.app/github/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline decoration-dotted underline-offset-4 hover:decoration-solid"
        >
          View documentation
        </a>
      </p>
    </>
  );
}

function AlertBox({ icon: Icon, title, description, variant }: AlertBoxProps) {
  const colors = COLORS[variant];

  return (
    <div
      className={`flex items-center space-x-3 rounded-lg border ${colors.border} ${colors.bg} p-4`}
    >
      <Icon className={`size-5 ${colors.iconText}`} />
      <div className="flex-1">
        <p className={`text-sm font-medium ${colors.titleText}`}>{title}</p>
        <p className={`text-sm ${colors.descText}`}>{description}</p>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  loadingLabel,
  isLoading,
  onClick,
  disabled = false,
  variant = "default",
  className = "w-full",
}: ActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      variant={variant}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          <Icon className="mr-2 size-4" />
          {label}
        </>
      )}
    </Button>
  );
}

export default function GitHubSync({ closeSheet }: { closeSheet: () => void }) {
  const {
    chatId,
    fetchedChat,
    selectedVersion,
    refreshChatData,
    handleVersionSelect,
  } = useComponentContext();
  const { toast } = useToast();

  const [githubConnection, setGithubConnection] =
    useState<Tables<"github_connections"> | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const isGithubConnected = !!githubConnection;
  const hasGithubRepo = !!fetchedChat?.github_repo_url;
  const isPremium = !!subscription;
  const isAnyActionLoading = isSyncing || isForceSyncing || isPulling;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [connectionData, subscriptionData] = await Promise.all([
          getGithubConnectionForUser(),
          getSubscription(),
        ]);
        setGithubConnection(connectionData);
        setSubscription(subscriptionData as Subscription | null);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    if (fetchedChat?.slug) {
      setRepoName(`coderocket-${fetchedChat.slug}`);
    } else if (fetchedChat?.title) {
      const sanitized = fetchedChat.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setRepoName(`coderocket-${sanitized}`);
    } else {
      setRepoName(`coderocket-component-${chatId.slice(0, 8)}`);
    }
  }, [fetchedChat, chatId]);

  const handleAction = async (
    action: () => Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }>,
    setLoading: (loading: boolean) => void,
    actionName: string,
    options: {
      successTitle?: string;
      errorTitle?: string;
      shouldRefresh?: boolean;
      shouldCloseSheet?: boolean;
      shouldHandleVersion?: boolean;
    } = {},
  ) => {
    const {
      successTitle = "Success",
      errorTitle = "Error",
      shouldRefresh = true,
      shouldCloseSheet = false,
      shouldHandleVersion = false,
    } = options;

    setLoading(true);
    try {
      console.log(`🔍 Starting ${actionName}`);
      const result = await action();
      console.log(`🔍 ${actionName} result:`, result);

      if (result.success) {
        const isNoChanges =
          result.message?.includes("No changes detected") ||
          result.message?.includes("already up-to-date");

        toast({
          title: isNoChanges ? "Already Up-to-Date" : successTitle,
          description: result.message || `${actionName} completed successfully`,
          duration: isNoChanges ? 6000 : 4000,
        });

        if (shouldRefresh && refreshChatData) {
          const refreshedMessages = await refreshChatData();

          if (shouldHandleVersion && refreshedMessages) {
            const lastMessage = refreshedMessages.reduce(
              (prev, current) =>
                prev.version > current.version ? prev : current,
              { version: 0 },
            );
            if (lastMessage) {
              handleVersionSelect(lastMessage.version);
            }
          }
        }

        if (shouldCloseSheet) {
          closeSheet();
        }
      } else {
        console.error(`❌ ${actionName} failed:`, result.error);
        toast({
          title: errorTitle,
          description: result.error || `Failed to ${actionName}`,
          variant: "destructive",
        });
        if (shouldCloseSheet) {
          closeSheet();
        }
      }
    } catch (error) {
      console.error(`❌ ${actionName} error:`, error);
      toast({
        title: errorTitle,
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
      if (shouldCloseSheet) {
        closeSheet();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRepo = async () => {
    if (!repoName.trim()) {
      toast({
        variant: "destructive",
        title: "Repository name required",
        description: "Please enter a repository name.",
        duration: 4000,
      });
      return;
    }

    await handleAction(
      () => createGithubRepo(chatId, repoName.trim()),
      setIsCreatingRepo,
      "create repository",
      {
        successTitle: "Repository created!",
        errorTitle: "Failed to create repository",
      },
    );
  };

  const handleSync = () =>
    handleAction(
      () => syncComponentToGithub(fetchedChat!.id),
      setIsSyncing,
      "sync",
      { shouldCloseSheet: true },
    );

  const handleForceSync = () =>
    handleAction(
      () => syncComponentToGithub(fetchedChat!.id, undefined, true),
      setIsForceSyncing,
      "force sync",
      { successTitle: "Force Sync Complete" },
    );

  const handlePull = () =>
    handleAction(() => pullFromGithub(fetchedChat!.id), setIsPulling, "pull", {
      successTitle: "Pull Complete",
      shouldCloseSheet: true,
      shouldHandleVersion: true,
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <AlertBox
          icon={AlertCircle}
          title="Premium feature required"
          description="GitHub sync is available for premium users only. Upgrade your plan to sync your components with GitHub repositories."
          variant="amber"
        />
        <Button variant="outline" asChild>
          <a href="/pricing" className="flex items-center space-x-2">
            <span>Upgrade to Premium</span>
          </a>
        </Button>
      </div>
    );
  }

  if (!isGithubConnected) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <AlertBox
          icon={AlertCircle}
          title="GitHub not connected"
          description="Connect your GitHub account in Account Settings to sync components."
          variant="orange"
        />
        <Button variant="outline" asChild>
          <a href="/account" className="flex items-center space-x-2">
            <SiGithub className="size-4" />
            <span>Go to Account Settings</span>
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader />

      {!hasGithubRepo ? (
        <div className="space-y-4">
          <AlertBox
            icon={SiGithub}
            title="Create GitHub Repository"
            description="Create a new repository to sync this component with GitHub."
            variant="blue"
          />

          <div className="space-y-3">
            <div>
              <Label htmlFor="repoName" className="text-sm font-medium">
                Repository Name
              </Label>
              <Input
                id="repoName"
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="my-component-repo"
                className="mt-1"
                disabled={isCreatingRepo}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Repository will be created as:{" "}
                {githubConnection?.github_username || "unknown"}/{repoName}
              </p>
            </div>

            <ActionButton
              icon={SiGithub}
              label="Create GitHub Repository"
              loadingLabel="Creating Repository..."
              isLoading={isCreatingRepo}
              onClick={handleCreateRepo}
              disabled={!repoName.trim()}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col items-start justify-center space-y-2">
              <div className="flex items-center space-x-3">
                <SiGithub className="size-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    Connected to GitHub
                  </p>
                  <p className="text-sm text-emerald-700">
                    {fetchedChat?.github_repo_name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button variant="secondary" size="sm" asChild className="w-full">
            <a
              href={fetchedChat?.github_repo_url || ""}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1"
            >
              <ExternalLink className="size-4" />
              <span>View Repo</span>
            </a>
          </Button>

          <div className="space-y-3">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sync Current Version</p>
                  <p className="text-sm text-muted-foreground">
                    Push{" "}
                    <span className="font-semibold">
                      version {selectedVersion}
                    </span>{" "}
                    to GitHub repository.
                  </p>
                </div>
              </div>

              <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <h4 className="mb-1 text-sm font-medium text-blue-800">
                  Synchronization Options
                </h4>
                <div className="space-y-1 text-xs text-blue-700">
                  <p>
                    <strong>Pull from GitHub:</strong> Fetch changes from GitHub
                    and create a new version
                  </p>
                  <p>
                    <strong>Push to GitHub:</strong> Only if web version is
                    newer
                  </p>
                  <p>
                    <strong>Force Push to GitHub:</strong> Push to GitHub and
                    override any GitHub changes
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <ActionButton
                  icon={Download}
                  label="Pull from GitHub"
                  loadingLabel="Pulling from GitHub..."
                  isLoading={isPulling}
                  onClick={handlePull}
                  disabled={isAnyActionLoading}
                />

                <ActionButton
                  icon={Upload}
                  label="Push to GitHub"
                  loadingLabel="Pushing to GitHub..."
                  isLoading={isSyncing}
                  onClick={handleSync}
                  disabled={isAnyActionLoading}
                  variant="outline"
                />

                <ActionButton
                  icon={Upload}
                  label="Force Push (Override GitHub)"
                  loadingLabel="Force Pushing..."
                  isLoading={isForceSyncing}
                  onClick={handleForceSync}
                  disabled={isAnyActionLoading}
                  variant="outline"
                />
              </div>
            </div>

            {fetchedChat?.last_github_sync && (
              <p className="text-xs text-muted-foreground">
                Last synced:{" "}
                {new Date(fetchedChat.last_github_sync).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
