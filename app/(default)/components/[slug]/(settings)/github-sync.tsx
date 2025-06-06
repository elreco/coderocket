"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import { ExternalLink, Upload, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useComponentContext } from "@/context/component-context";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";

import {
  createGithubRepo,
  syncComponentToGithub,
  toggleGithubSync,
  getGithubConnectionForUser,
} from "../github-sync-actions";

export default function GitHubSync() {
  const { chatId, fetchedChat, selectedVersion } = useComponentContext();
  const { toast } = useToast();

  const [githubConnection, setGithubConnection] =
    useState<Tables<"github_connections"> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);

  // États dérivés
  const isGithubConnected = !!githubConnection;
  const hasGithubRepo = !!fetchedChat?.github_repo_url;
  const isSyncEnabled = fetchedChat?.github_sync_enabled || false;

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

        // Refresh the chat data to get updated GitHub info
        window.location.reload(); // Simple refresh for now
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
        toast({
          title: "Success",
          description: "Component synced to GitHub successfully",
        });
        await mutate();
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

  const handleToggleSync = async (enabled: boolean) => {
    try {
      const result = await toggleGithubSync(chatId, enabled);

      if (result.success) {
        toast({
          title: enabled ? "GitHub sync enabled" : "GitHub sync disabled",
          description: enabled
            ? "This component will be synced to GitHub."
            : "This component will no longer be synced to GitHub.",
          duration: 4000,
        });
        // Refresh to update the state
        window.location.reload();
      } else {
        throw new Error(result.error || "Failed to update sync settings");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update settings",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        duration: 4000,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold">GitHub Sync</h3>
        <div className="text-sm text-muted-foreground">
          Loading GitHub connection...
        </div>
      </div>
    );
  }

  if (!isGithubConnected) {
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold">GitHub Sync</h3>
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
      <h3 className="text-base font-semibold">GitHub Sync</h3>

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
            <div className="flex items-center justify-between">
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
              <Button variant="outline" size="sm" asChild>
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
            </div>
          </div>

          {/* Sync Settings */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Enable GitHub Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync changes to your GitHub repository.
              </p>
            </div>
            <Switch
              checked={isSyncEnabled}
              onCheckedChange={handleToggleSync}
            />
          </div>

          {/* Manual Sync */}
          {isSyncEnabled && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Sync Current Version</p>
                    <p className="text-sm text-muted-foreground">
                      Push version {selectedVersion} to GitHub repository.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full"
                  variant="outline"
                >
                  {isSyncing ? (
                    <>Syncing...</>
                  ) : (
                    <>
                      <Upload className="mr-2 size-4" />
                      Sync to GitHub
                    </>
                  )}
                </Button>
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
