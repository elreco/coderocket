"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import {
  ExternalLink,
  Upload,
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useComponentContext } from "@/context/component-context";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";

import {
  createGithubRepo,
  syncComponentToGithub,
  getGithubConnectionForUser,
  pullFromGithub,
} from "../github-sync-actions";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // États dérivés
  const isGithubConnected = !!githubConnection;
  const hasGithubRepo = !!fetchedChat?.github_repo_url;

  useEffect(() => {
    loadGithubConnection();
    // Générer un nom de repo par défaut basé sur le slug ou titre
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

  const loadGithubConnection = async () => {
    setIsLoading(true);
    try {
      const connection = await getGithubConnectionForUser();
      setGithubConnection(connection);
    } catch (error) {
      console.error("Failed to load GitHub connection:", error);
    } finally {
      setIsLoading(false);
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

    setIsCreatingRepo(true);
    try {
      const result = await createGithubRepo(chatId, repoName.trim());

      if (result.success) {
        toast({
          title: "Repository created!",
          description: `GitHub repository "${repoName}" has been created successfully.`,
          duration: 4000,
        });
        // Refresh to show the new repository
        if (refreshChatData) {
          await refreshChatData();
        }
      } else {
        throw new Error(result.error || "Failed to create repository");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create repository",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        duration: 4000,
      });
    } finally {
      setIsCreatingRepo(false);
    }
  };

  const handleSync = async () => {
    if (!fetchedChat?.id) return;

    setIsSyncing(true);
    try {
      console.log("🔍 Starting GitHub sync for chat:", fetchedChat.id);
      const result = await syncComponentToGithub(fetchedChat.id);
      console.log("🔍 Sync result:", result);

      if (result.success) {
        const isNoChanges = result.message?.includes("No changes detected");

        toast({
          title: isNoChanges ? "Already Up-to-Date" : "Success",
          description:
            result.message || "Component synced to GitHub successfully",
          duration: isNoChanges ? 6000 : 4000, // Show longer for informational messages
        });
        // Refresh to update last_github_sync
        if (refreshChatData) {
          await refreshChatData();
        }
        closeSheet();
      } else {
        console.error("❌ Sync failed:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to sync to GitHub",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Sync error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceSync = async () => {
    if (!fetchedChat?.id) return;

    setIsForceSyncing(true);
    try {
      console.log("🔍 Starting FORCE GitHub sync for chat:", fetchedChat.id);
      const result = await syncComponentToGithub(
        fetchedChat.id,
        undefined,
        true,
      );
      console.log("🔍 Force sync result:", result);

      if (result.success) {
        const isNoChanges = result.message?.includes("already up-to-date");

        toast({
          title: isNoChanges ? "Already Up-to-Date" : "Force Sync Complete",
          description:
            result.message || "All files have been force synced to GitHub",
          duration: isNoChanges ? 6000 : 4000,
        });
        // Refresh to update last_github_sync
        if (refreshChatData) {
          await refreshChatData();
        }
      } else {
        console.error("❌ Force sync failed:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to force sync to GitHub",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Force sync error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsForceSyncing(false);
    }
  };

  const handlePull = async () => {
    if (!fetchedChat?.id) return;

    setIsPulling(true);
    try {
      console.log("🔍 Starting GitHub pull for chat:", fetchedChat.id);
      const result = await pullFromGithub(fetchedChat.id);
      console.log("🔍 Pull result:", result);

      if (result.success) {
        toast({
          title: "Pull Complete",
          description:
            result.message || "Changes pulled from GitHub successfully",
        });
        const refreshedChatMessages =
          refreshChatData !== undefined ? await refreshChatData() : [];

        if (refreshedChatMessages) {
          const refreshedLastAssistantMessage = refreshedChatMessages.reduce(
            (prev, current) =>
              prev.version > current.version ? prev : current,
            { version: 0 },
          );

          if (refreshedLastAssistantMessage) {
            handleVersionSelect(refreshedLastAssistantMessage.version);
          }
        }

        closeSheet();
      } else {
        console.error("❌ Pull failed:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to pull from GitHub",
          variant: "destructive",
        });
        closeSheet();
      }
    } catch (error) {
      console.error("❌ Pull error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      closeSheet();
    } finally {
      setIsPulling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Modify Code on GitHub</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Beta</Badge>
            <Badge>New</Badge>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Loading GitHub connection...
        </div>
      </div>
    );
  }

  if (!isGithubConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Modify Code on GitHub</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Beta</Badge>
            <Badge>New</Badge>
          </div>
        </div>
        <div className="flex items-center space-x-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <AlertCircle className="size-5 text-orange-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">
              GitHub not connected
            </p>
            <p className="text-sm text-orange-700">
              Connect your GitHub account in Account Settings to sync
              components.
            </p>
          </div>
        </div>
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
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Modify Code on GitHub</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Beta</Badge>
          <Badge>New</Badge>
        </div>
      </div>

      {!hasGithubRepo ? (
        // Create Repository Section
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center space-x-3">
              <SiGithub className="size-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  Create GitHub Repository
                </p>
                <p className="text-sm text-blue-700">
                  Create a new repository to sync this component with GitHub.
                </p>
              </div>
            </div>
          </div>

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

            <Button
              onClick={handleCreateRepo}
              disabled={isCreatingRepo || !repoName.trim()}
              className="w-full"
            >
              {isCreatingRepo ? (
                <>Creating Repository...</>
              ) : (
                <>
                  <SiGithub className="mr-2 size-4" />
                  Create GitHub Repository
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        // Repository Management Section
        <div className="space-y-4">
          {/* Repository Info */}
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

          {/* Manual Sync */}
          {hasGithubRepo && (
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
                      <strong>Pull from GitHub:</strong> Fetch changes from
                      GitHub and create a new version
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
                  <Button
                    onClick={handlePull}
                    disabled={isPulling || isSyncing || isForceSyncing}
                    className="w-full"
                    variant="default"
                  >
                    {isPulling ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Pulling from GitHub...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 size-4" />
                        Pull from GitHub
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleSync}
                    disabled={isSyncing || isForceSyncing || isPulling}
                    className="w-full"
                    variant="outline"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Pushing to GitHub...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 size-4" />
                        Push to GitHub
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleForceSync}
                    disabled={isSyncing || isForceSyncing || isPulling}
                    variant="outline"
                    className="w-full"
                  >
                    {isForceSyncing ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Force Pushing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 size-4" />
                        Force Push (Override GitHub)
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {fetchedChat?.last_github_sync && (
                <p className="text-xs text-muted-foreground">
                  Last synced:{" "}
                  {new Date(fetchedChat.last_github_sync).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
