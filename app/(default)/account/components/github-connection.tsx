"use client";

import { Github, Unlink, ExternalLink, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";

import { getGithubConnection, disconnectGithub } from "../github-actions";

interface GitHubConnectionProps {
  initialConnection: Tables<"github_connections"> | null;
}

export default function GitHubConnection({
  initialConnection,
}: GitHubConnectionProps) {
  const [connection, setConnection] =
    useState<Tables<"github_connections"> | null>(initialConnection);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Écouter les paramètres URL pour les messages de succès/erreur
    const params = new URLSearchParams(window.location.search);

    if (params.get("github_success") === "true") {
      toast({
        title: "GitHub Connected",
        description: "Your GitHub account has been successfully connected!",
        duration: 4000,
      });
      // Recharger les données de connexion
      refreshConnection();
      // Nettoyer l'URL
      window.history.replaceState({}, "", window.location.pathname);
    }

    const githubError = params.get("github_error");
    if (githubError) {
      let errorMessage = "Failed to connect to GitHub";
      switch (githubError) {
        case "access_denied":
          errorMessage =
            "Access denied. Please try again and authorize the application.";
          break;
        case "missing_params":
          errorMessage = "Invalid parameters received from GitHub.";
          break;
        case "invalid_state":
          errorMessage = "Security error. Please try again.";
          break;
        case "oauth_failed":
          errorMessage = "OAuth process failed. Please try again.";
          break;
      }

      toast({
        variant: "destructive",
        title: "GitHub Connection Failed",
        description: errorMessage,
        duration: 4000,
      });
      // Nettoyer l'URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  const refreshConnection = async () => {
    const newConnection = await getGithubConnection();
    setConnection(newConnection);
  };

  const handleConnect = () => {
    setIsLoading(true);
    // Rediriger vers l'endpoint OAuth GitHub
    window.location.href = "/api/github/oauth";
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const result = await disconnectGithub();
      if (result.success) {
        setConnection(null);
        toast({
          title: "GitHub Disconnected",
          description: "Your GitHub account has been disconnected.",
          duration: 4000,
        });
      } else {
        throw new Error(result.error || "Failed to disconnect");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to disconnect GitHub",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Github className="size-6" />
          <div>
            <h3 className="font-medium">GitHub Integration</h3>
            <p className="text-sm text-muted-foreground">
              {connection
                ? `Connected as @${connection.github_username}`
                : "Connect your GitHub account to sync your components"}
            </p>
          </div>
        </div>

        {connection ? (
          <div className="flex items-center space-x-2">
            <Button variant="background" size="sm" asChild>
              <a
                href={`https://github.com/${connection.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1"
              >
                <ExternalLink className="size-4" />
                <span>Profile</span>
              </a>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="flex items-center space-x-1"
            >
              <Unlink className="size-4" />
              <span>Disconnect</span>
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <Github className="size-4" />
            <span>Connect GitHub</span>
          </Button>
        )}
      </div>

      {connection && (
        <div className="rounded-md bg-secondary p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium text-emerald-600">
            <CheckCircle className="size-4" />
            <span>GitHub Connected</span>
          </div>
          <ul className="space-y-1 text-muted-foreground">
            <li>You can now sync your components to GitHub repositories</li>
            <li>Each component can be pushed to its own repository</li>
            <li>Collaborate with others and edit your code locally</li>
          </ul>
        </div>
      )}
    </div>
  );
}
