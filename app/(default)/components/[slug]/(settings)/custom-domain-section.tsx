"use client";

import {
  Globe,
  CheckCircle2,
  Loader2,
  Shield,
  AlertCircle,
  Copy,
  Trash2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CustomDomainData } from "@/types/custom-domain";

import {
  addCustomDomain,
  verifyCustomDomain,
  deleteCustomDomain,
  checkCustomDomainAvailability,
  refreshSSLStatus,
} from "../actions";

import { DeleteDomainDialog } from "./delete-domain-dialog";

interface CustomDomainSectionProps {
  chatId: string;
  isOwner: boolean;
  isDeployed: boolean;
  initialCustomDomain?: CustomDomainData | null;
  onDomainChange?: (domain: CustomDomainData | null) => void;
}

export default function CustomDomainSection({
  chatId,
  isOwner,
  isDeployed,
  initialCustomDomain,
  onDomainChange,
}: CustomDomainSectionProps) {
  const { toast } = useToast();
  const [domain, setDomain] = useState("");
  const [customDomain, setCustomDomain] = useState<CustomDomainData | null>(
    initialCustomDomain || null,
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshingSSL, setIsRefreshingSSL] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInstructions, setShowInstructions] = useState(
    initialCustomDomain ? !initialCustomDomain.is_verified : false,
  );

  useEffect(() => {
    if (initialCustomDomain) {
      setCustomDomain(initialCustomDomain);
      if (!initialCustomDomain.is_verified) {
        setShowInstructions(true);
      }
    }
  }, [initialCustomDomain]);

  const handleAddDomain = async () => {
    if (!domain) {
      toast({
        variant: "destructive",
        title: "Domain required",
        description: "Please enter a domain name",
        duration: 4000,
      });
      return;
    }

    setIsAdding(true);

    try {
      const availability = await checkCustomDomainAvailability(domain);

      if (!availability.available) {
        toast({
          variant: "destructive",
          title: "Domain unavailable",
          description: availability.reason || "This domain cannot be used",
          duration: 4000,
        });
        return;
      }

      const result = await addCustomDomain(chatId, domain);

      setCustomDomain({
        id: result.id,
        domain: result.domain,
        verification_token: result.verificationToken,
        is_verified: false,
        ssl_status: "pending",
        created_at: new Date().toISOString(),
      });

      setShowInstructions(true);
      setDomain("");

      toast({
        variant: "default",
        title: "Domain added",
        description: "Please verify domain ownership by adding the DNS record",
        duration: 4000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to add domain",
        description:
          error instanceof Error ? error.message : "An error occurred",
        duration: 4000,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!customDomain) return;

    setIsVerifying(true);

    try {
      const result = await verifyCustomDomain(customDomain.id);

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: result.error || "Failed to verify domain",
          duration: 4000,
        });
        return;
      }

      setCustomDomain({
        ...customDomain,
        is_verified: true,
        verified_at: new Date().toISOString(),
      });

      setShowInstructions(false);

      toast({
        variant: "default",
        title: "Domain verified",
        description:
          result.warning ||
          "Your custom domain has been verified successfully. SSL certificate will be issued automatically.",
        duration: 5000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description:
          error instanceof Error ? error.message : "Failed to verify domain",
        duration: 4000,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (!customDomain) return;

    setIsDeleting(true);

    try {
      await deleteCustomDomain(customDomain.id);
      setCustomDomain(null);
      setShowInstructions(false);

      if (onDomainChange) {
        onDomainChange(null);
      }

      toast({
        variant: "default",
        title: "Domain removed",
        description: "Custom domain has been removed successfully",
        duration: 4000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to remove domain",
        description:
          error instanceof Error ? error.message : "An error occurred",
        duration: 4000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      variant: "default",
      title: "Copied",
      description: "Copied to clipboard",
      duration: 2000,
    });
  };

  const handleRefreshSSL = async () => {
    if (!customDomain?.id) return;

    setIsRefreshingSSL(true);

    try {
      const result = await refreshSSLStatus(customDomain.id);

      if (result.ssl_status === "active") {
        setCustomDomain((prev) =>
          prev ? { ...prev, ssl_status: "active" } : prev,
        );
        toast({
          variant: "default",
          title: "SSL Certificate Active",
          description: "Your domain is now secured with HTTPS!",
          duration: 5000,
        });
      } else {
        toast({
          variant: "default",
          title: "Still Pending",
          description:
            "SSL certificate is still being provisioned. This usually takes 2-5 minutes.",
          duration: 4000,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to check SSL status",
        description:
          error instanceof Error ? error.message : "An error occurred",
        duration: 4000,
      });
    } finally {
      setIsRefreshingSSL(false);
    }
  };

  const getSSLStatusBadge = (status: CustomDomainData["ssl_status"]) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "secondary" as const },
      active: { label: "Active", variant: "default" as const },
      expired: { label: "Expired", variant: "destructive" as const },
      failed: { label: "Failed", variant: "destructive" as const },
    };

    if (!status || !(status in statusConfig)) {
      return <Badge variant="secondary">Pending</Badge>;
    }

    const config = statusConfig[status as keyof typeof statusConfig];

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="border-border space-y-4 border-t pt-6">
      <div className="flex items-center gap-2">
        <Globe className="size-5" />
        <h3 className="text-base font-semibold">Custom Domain</h3>
      </div>

      {!isDeployed && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Deployment Required</AlertTitle>
          <AlertDescription>
            Your application must be deployed before you can add a custom
            domain.
          </AlertDescription>
        </Alert>
      )}

      {customDomain ? (
        <div className="space-y-4">
          <div className="border-border bg-muted/50 rounded-lg border p-4">
            <div className="space-y-3">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="leading-tight font-medium break-all">
                      {customDomain.domain}
                    </p>
                    <p className="text-muted-foreground mt-1.5 text-sm">
                      {customDomain.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-green-500 dark:text-green-400">
                          <CheckCircle2 className="size-4 mt-1" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                          <AlertCircle className="size-4" />
                          Awaiting verification
                        </span>
                      )}
                    </p>
                  </div>
                  {isOwner && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="size-4" />
                      Remove domain
                    </Button>
                  )}
                </div>

                {customDomain.is_verified && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Shield className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                    {getSSLStatusBadge(customDomain.ssl_status)}
                    {customDomain.ssl_status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={handleRefreshSSL}
                        disabled={isRefreshingSSL}
                      >
                        <RefreshCw
                          className={`mr-1.5 size-3.5 ${isRefreshingSSL ? "animate-spin" : ""}`}
                        />
                        <span className="text-xs">Check Status</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {customDomain.is_verified && (
                <Alert>
                  <CheckCircle2 className="size-4" />
                  <AlertTitle>Domain Active</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      Your application is now accessible at:
                    </p>
                    <a
                      href={`https://${customDomain.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium break-all underline"
                    >
                      <span className="break-all">
                        https://{customDomain.domain}
                      </span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {!customDomain.is_verified && showInstructions && (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>DNS Configuration Required</AlertTitle>
              <AlertDescription>
                <div className="mt-3 space-y-3">
                  <p className="text-sm font-medium">
                    Add these 2 DNS records to your domain:
                  </p>

                  <div className="space-y-3">
                    <div className="border-border bg-muted rounded-md border p-3">
                      <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase">
                        Record 1: Verification (TXT)
                      </p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-muted-foreground mb-1 text-xs">
                            Type
                          </p>
                          <code className="bg-background block rounded px-2 py-1.5 text-xs">
                            TXT
                          </code>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-muted-foreground text-xs">
                              Host
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() =>
                                copyToClipboard(
                                  `_coderocket-verify.${customDomain.domain}`,
                                )
                              }
                            >
                              <Copy className="mr-1 size-3" />
                              Copy
                            </Button>
                          </div>
                          <code className="bg-background block rounded px-2 py-1.5 text-xs break-all">
                            _coderocket-verify.{customDomain.domain}
                          </code>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-muted-foreground text-xs">
                              Value
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() =>
                                copyToClipboard(customDomain.verification_token)
                              }
                            >
                              <Copy className="mr-1 size-3" />
                              Copy
                            </Button>
                          </div>
                          <code className="bg-background block rounded px-2 py-1.5 text-xs break-all">
                            {customDomain.verification_token}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="border-border bg-muted rounded-md border p-3">
                      <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase">
                        Record 2: Routing (CNAME)
                      </p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-muted-foreground mb-1 text-xs">
                            Type
                          </p>
                          <code className="bg-background block rounded px-2 py-1.5 text-xs">
                            CNAME
                          </code>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-muted-foreground text-xs">
                              Host
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() =>
                                copyToClipboard(customDomain.domain)
                              }
                            >
                              <Copy className="mr-1 size-3" />
                              Copy
                            </Button>
                          </div>
                          <code className="bg-background block rounded px-2 py-1.5 text-xs break-all">
                            {customDomain.domain}
                          </code>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-muted-foreground text-xs">
                              Value
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => copyToClipboard("coderocket.app")}
                            >
                              <Copy className="mr-1 size-3" />
                              Copy
                            </Button>
                          </div>
                          <code className="bg-background block rounded px-2 py-1.5 text-xs break-all">
                            coderocket.app
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs">
                      DNS propagation can take up to 48 hours, but usually
                      completes within a few minutes.
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleVerifyDomain();
                    }}
                  >
                    <Button
                      type="submit"
                      disabled={isVerifying}
                      className="w-full"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 size-4" />
                          Verify Domain
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (domain.trim()) {
              handleAddDomain();
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="custom-domain">Domain Name</Label>
            <Input
              id="custom-domain"
              type="text"
              placeholder="app.example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value.toLowerCase())}
              disabled={!isOwner || !isDeployed}
            />
            <p className="text-muted-foreground text-xs">
              Enter your custom domain (e.g., app.example.com or example.com)
            </p>
          </div>

          <Button
            type="submit"
            disabled={!isOwner || !isDeployed || isAdding || !domain}
            className="w-full"
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Globe className="mr-2 size-4" />
                Add Custom Domain
              </>
            )}
          </Button>

          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-start gap-3">
              <Shield className="size-5 shrink-0 text-green-500 mt-1" />
              <div className="flex-1">
                <p className="font-medium mb-2 text-green-500">
                  Automatic HTTPS / SSL
                </p>
                <p className="text-white text-sm">
                  SSL certificates are automatically provisioned and managed by
                  Vercel. Once your domain is verified, HTTPS will be enabled
                  within minutes. No action required!
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {customDomain && (
        <DeleteDomainDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          domain={customDomain.domain}
          onConfirm={handleDeleteDomain}
        />
      )}
    </div>
  );
}
