"use client";

import {
  Rocket,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Zap,
  Layers,
} from "lucide-react";
import { useState, useEffect } from "react";

import { PremiumFeatureAlert } from "@/components/premium-feature-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useComponentContext } from "@/context/component-context";
import { toast } from "@/hooks/use-toast";
import { CustomDomainData } from "@/types/custom-domain";

import {
  deployComponent,
  undeployComponent,
  updateDeploymentSubdomain,
  checkSubdomainAvailability,
  getCustomDomain,
} from "../actions";

import CustomDomainSection from "./custom-domain-section";

export default function DeploymentContent() {
  const {
    chatId,
    fetchedChat,
    user,
    messages,
    refreshChat,
    isWebcontainerReady,
    customDomain: contextCustomDomain,
    subscription: contextSubscription,
  } = useComponentContext();
  const [subdomain, setSubdomain] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isUndeploying, setIsUndeploying] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isUpdatingSubdomain, setIsUpdatingSubdomain] = useState(false);
  const [customDomain, setCustomDomain] = useState<CustomDomainData | null>(
    null,
  );

  const subscription = contextSubscription;

  const isOwner = user?.id === fetchedChat?.user_id;
  const isDeployed = fetchedChat?.is_deployed;
  const currentSubdomain = fetchedChat?.deploy_subdomain;
  const currentDeployedVersion = fetchedChat?.deployed_version;

  const deployedUrl =
    customDomain?.is_verified === true && customDomain?.domain
      ? customDomain.domain
      : currentSubdomain
        ? `${currentSubdomain}.coderocket.app`
        : null;

  const availableVersions = messages
    .filter((m) => m.role === "user")
    .map((m) => m.version)
    .sort((a, b) => b - a);

  const latestVersion =
    availableVersions.length > 0 ? availableVersions[0] : null;

  useEffect(() => {
    const fetchCustomDomainDetails = async () => {
      if (isDeployed && contextCustomDomain) {
        try {
          const fullDomain = await getCustomDomain(chatId);
          setCustomDomain(fullDomain as typeof customDomain);
        } catch (error) {
          console.error("Error fetching custom domain details:", error);
        }
      }
    };

    fetchCustomDomainDetails();
  }, [chatId, isDeployed, contextCustomDomain]);

  useEffect(() => {
    if (contextCustomDomain && !customDomain) {
      setCustomDomain((prev) => {
        if (!prev || prev.domain !== contextCustomDomain.domain) {
          return {
            id: prev?.id || "",
            domain: contextCustomDomain.domain,
            verification_token: prev?.verification_token || "",
            is_verified: contextCustomDomain.is_verified,
            verified_at: prev?.verified_at,
            ssl_status: prev?.ssl_status || null,
            created_at: prev?.created_at || new Date().toISOString(),
          };
        }
        return prev;
      });
    }
  }, [contextCustomDomain, customDomain]);

  useEffect(() => {
    if (currentSubdomain) {
      setSubdomain(currentSubdomain);
    }
    if (
      currentDeployedVersion !== null &&
      currentDeployedVersion !== undefined
    ) {
      setSelectedVersion(currentDeployedVersion);
    } else if (latestVersion !== null) {
      setSelectedVersion(latestVersion);
    }
  }, [currentSubdomain, currentDeployedVersion, latestVersion]);

  const validateSubdomain = (value: string): boolean => {
    const regex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    return value.length >= 3 && value.length <= 63 && regex.test(value);
  };

  const handleCheckAvailability = async () => {
    if (!subdomain || !validateSubdomain(subdomain)) {
      toast({
        variant: "destructive",
        title: "Invalid subdomain",
        description:
          "Subdomain must be 3-63 characters, contain only lowercase letters, numbers, and hyphens, and start/end with a letter or number.",
        duration: 4000,
      });
      return;
    }

    setIsCheckingAvailability(true);
    setIsAvailable(null);

    try {
      const available = await checkSubdomainAvailability(subdomain);
      setIsAvailable(available);

      if (!available) {
        toast({
          variant: "destructive",
          title: "Subdomain unavailable",
          description:
            "This subdomain is already taken. Please try another one.",
          duration: 4000,
        });
      } else {
        toast({
          variant: "default",
          title: "Subdomain available",
          description: `${subdomain}.coderocket.app is available!`,
          duration: 4000,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to check availability",
        duration: 4000,
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleDeploy = async () => {
    if (!isOwner) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "Only the owner can deploy this application.",
        duration: 4000,
      });
      return;
    }

    if (!subscription) {
      toast({
        variant: "destructive",
        title: "Premium required",
        description:
          "Deployment is a premium feature. Upgrade to deploy your applications.",
        duration: 4000,
      });
      return;
    }

    if (!subdomain || !validateSubdomain(subdomain)) {
      toast({
        variant: "destructive",
        title: "Invalid subdomain",
        description: "Please enter a valid subdomain before deploying.",
        duration: 4000,
      });
      return;
    }

    if (selectedVersion === null) {
      toast({
        variant: "destructive",
        title: "No version selected",
        description: "Please select a version to deploy.",
        duration: 4000,
      });
      return;
    }

    setIsDeploying(true);

    try {
      await deployComponent(chatId, subdomain, selectedVersion);

      setCustomDomain(null);

      if (refreshChat) {
        await refreshChat();
      }

      toast({
        variant: "default",
        title: "Deployment successful",
        description: `Your app is now live at ${subdomain}.coderocket.app`,
        duration: 4000,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "payment-required") {
        toast({
          variant: "destructive",
          title: "Premium required",
          description:
            "Deployment is a premium feature. Upgrade to deploy your applications.",
          duration: 4000,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Deployment failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to deploy application",
          duration: 4000,
        });
      }
    } finally {
      setIsDeploying(false);
    }
  };

  const handleUndeploy = async () => {
    if (!isOwner) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "Only the owner can undeploy this application.",
        duration: 4000,
      });
      return;
    }

    setIsUndeploying(true);

    try {
      await undeployComponent(chatId);

      setCustomDomain(null);

      if (refreshChat) {
        await refreshChat();
      }

      toast({
        variant: "default",
        title: "Application undeployed",
        description: "Your application has been removed from production.",
        duration: 4000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to undeploy",
        description:
          error instanceof Error
            ? error.message
            : "Failed to undeploy application",
        duration: 4000,
      });
    } finally {
      setIsUndeploying(false);
    }
  };

  const handleUpdateSubdomain = async () => {
    if (!isOwner) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "Only the owner can update the subdomain.",
        duration: 4000,
      });
      return;
    }

    if (!subdomain || !validateSubdomain(subdomain)) {
      toast({
        variant: "destructive",
        title: "Invalid subdomain",
        description: "Please enter a valid subdomain.",
        duration: 4000,
      });
      return;
    }

    const hasSubdomainChanged = subdomain !== currentSubdomain;
    const hasVersionChanged = selectedVersion !== currentDeployedVersion;

    if (!hasSubdomainChanged && !hasVersionChanged) {
      toast({
        variant: "default",
        title: "No changes",
        description: "No changes detected.",
        duration: 4000,
      });
      return;
    }

    setIsUpdatingSubdomain(true);

    try {
      await updateDeploymentSubdomain(
        chatId,
        subdomain,
        hasVersionChanged ? (selectedVersion ?? undefined) : undefined,
      );

      if (refreshChat) {
        await refreshChat();
      }

      toast({
        variant: "default",
        title: "Deployment updated",
        description: `Your changes have been applied successfully`,
        duration: 4000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update deployment",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update deployment",
        duration: 4000,
      });
    } finally {
      setIsUpdatingSubdomain(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center">
        <h2 className="text-base font-semibold">Deploy Application</h2>
      </div>

      {isDeployed && currentDeployedVersion !== undefined && deployedUrl && (
        <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <CheckCircle2 className="size-5 shrink-0 text-green-500" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-green-700 dark:text-green-400">
              Application Deployed
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your app is live and accessible at:
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://${deployedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 break-all text-sm font-medium text-primary hover:underline"
                >
                  <span className="break-all">{deployedUrl}</span>
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
                {customDomain?.is_verified && (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                    Custom Domain
                  </span>
                )}
              </div>
              {customDomain?.is_verified && currentSubdomain && (
                <a
                  href={`https://${currentSubdomain}.coderocket.app`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 break-all text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  <span className="break-all">
                    Also available at: {currentSubdomain}.coderocket.app
                  </span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              )}
              <p className="text-xs text-muted-foreground">
                Version #{currentDeployedVersion}
              </p>
            </div>
          </div>
        </div>
      )}

      {!subscription && (
        <PremiumFeatureAlert description="Deployment is available exclusively for premium users. Upgrade your account to deploy your applications to custom subdomains." />
      )}

      {!isOwner && subscription && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <XCircle className="size-5 text-yellow-500" />
          <div className="flex-1">
            <p className="font-medium text-yellow-700 dark:text-yellow-400">
              View Only
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to manage deployment for this
              application. Only the owner can deploy or modify deployment
              settings.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="version" className="flex items-center gap-2">
            <Layers className="size-4" />
            Version to Deploy
          </Label>
          <Select
            value={selectedVersion?.toString() ?? ""}
            onValueChange={(value) => setSelectedVersion(parseInt(value))}
            disabled={!isOwner || !subscription}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a version" />
            </SelectTrigger>
            <SelectContent>
              {availableVersions.map((version) => (
                <SelectItem key={version} value={version.toString()}>
                  Version #{version}
                  {version === latestVersion && " (Latest)"}
                  {version === currentDeployedVersion &&
                    " (Currently Deployed)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select which version of your application to deploy. The latest
            version is selected by default.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subdomain" className="flex items-center gap-2">
            <Globe className="size-4" />
            Subdomain
          </Label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isDeployed && validateSubdomain(subdomain)) {
                handleCheckAvailability();
              } else if (isDeployed) {
                handleUpdateSubdomain();
              } else if (!isDeployed) {
                handleDeploy();
              }
            }}
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="subdomain"
                  type="text"
                  placeholder="myapp"
                  value={subdomain}
                  onChange={(e) => {
                    const value = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "");
                    setSubdomain(value);
                    setIsAvailable(null);
                  }}
                  disabled={!isOwner}
                  className="pr-32"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  .coderocket.app
                </span>
              </div>
              {!isDeployed && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheckAvailability}
                  disabled={
                    !isOwner ||
                    isCheckingAvailability ||
                    !subdomain ||
                    !validateSubdomain(subdomain)
                  }
                >
                  {isCheckingAvailability ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Check"
                  )}
                </Button>
              )}
            </div>
          </form>
          {isAvailable !== null && !isDeployed && (
            <p
              className={`flex items-center gap-2 text-sm ${
                isAvailable
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {isAvailable ? (
                <>
                  <CheckCircle2 className="size-4" />
                  This subdomain is available
                </>
              ) : (
                <>
                  <XCircle className="size-4" />
                  This subdomain is already taken
                </>
              )}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Subdomain must be 3-63 characters, contain only lowercase letters,
            numbers, and hyphens, and start/end with a letter or number.
          </p>
        </div>

        {!isDeployed && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="flex items-start gap-3">
              <Globe className="size-5 shrink-0 text-blue-500" />
              <div className="flex-1">
                <p className="font-medium text-blue-700 dark:text-blue-400">
                  Want to use your own domain?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  After deploying with a CodeRocket subdomain, you&apos;ll be
                  able to add your custom domain (like{" "}
                  <span className="font-mono">app.yourdomain.com</span>) in the{" "}
                  <strong>Custom Domain</strong> section below. We&apos;ll
                  automatically provision HTTPS/SSL certificates for you.
                </p>
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isDeployed) {
              handleDeploy();
            }
          }}
        >
          {!isDeployed ? (
            <Button
              type="submit"
              disabled={
                !isOwner ||
                !subscription ||
                isDeploying ||
                !subdomain ||
                !validateSubdomain(subdomain) ||
                selectedVersion === null ||
                !isWebcontainerReady
              }
              className="w-full"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deploying...
                </>
              ) : !subscription ? (
                <>
                  <Zap className="mr-2 size-4" />
                  Premium Required
                </>
              ) : !isWebcontainerReady ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Building Application...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 size-4" />
                  Deploy Application
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              {(subdomain !== currentSubdomain ||
                selectedVersion !== currentDeployedVersion) && (
                <Button
                  onClick={handleUpdateSubdomain}
                  disabled={
                    !isOwner ||
                    !subscription ||
                    isUpdatingSubdomain ||
                    !subdomain ||
                    !validateSubdomain(subdomain)
                  }
                  className="w-full"
                >
                  {isUpdatingSubdomain ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 size-4" />
                      Update Deployment
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={handleUndeploy}
                disabled={!isOwner || isUndeploying}
                className="w-full"
              >
                {isUndeploying ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Undeploying...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 size-4" />
                    Undeploy Application
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <h3 className="mb-2 font-medium">About Deployment</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              Your application will be accessible at your CodeRocket subdomain
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              All deployments include HTTPS/SSL certificates automatically
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>The deployment uses the selected version of your code</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              You can add a custom domain after deployment (see section below)
            </span>
          </li>
        </ul>
      </div>

      {isDeployed && subscription && (
        <CustomDomainSection
          chatId={chatId}
          isOwner={isOwner}
          isDeployed={isDeployed}
          initialCustomDomain={customDomain}
          onDomainChange={(domain) => {
            setCustomDomain(domain);
            if (refreshChat) {
              refreshChat();
            }
          }}
        />
      )}
    </div>
  );
}
