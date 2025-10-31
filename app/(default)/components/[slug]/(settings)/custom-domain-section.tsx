"use client";

import {
  Globe,
  CheckCircle2,
  Loader2,
  Shield,
  AlertCircle,
  Copy,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import {
  addCustomDomain,
  verifyCustomDomain,
  deleteCustomDomain,
  checkCustomDomainAvailability,
} from "../actions";

import { DeleteDomainDialog } from "./delete-domain-dialog";

interface CustomDomainSectionProps {
  chatId: string;
  isOwner: boolean;
  isDeployed: boolean;
  initialCustomDomain?: CustomDomain | null;
}

interface CustomDomain {
  id: string;
  domain: string;
  verification_token: string;
  is_verified: boolean | null;
  verified_at?: string | null;
  ssl_status: "pending" | "active" | "expired" | "failed" | null;
  created_at: string;
}

export default function CustomDomainSection({
  chatId,
  isOwner,
  isDeployed,
  initialCustomDomain,
}: CustomDomainSectionProps) {
  const { toast } = useToast();
  const [domain, setDomain] = useState("");
  const [customDomain, setCustomDomain] = useState<CustomDomain | null>(
    initialCustomDomain || null,
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInstructions, setShowInstructions] = useState(
    initialCustomDomain ? !initialCustomDomain.is_verified : false,
  );

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
      await verifyCustomDomain(customDomain.id);

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

  const getSSLStatusBadge = (status: CustomDomain["ssl_status"]) => {
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
    <div className="space-y-4 border-t border-border pt-6">
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
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{customDomain.domain}</p>
                  <p className="text-sm text-muted-foreground">
                    {customDomain.is_verified ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="size-4" />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                        <AlertCircle className="size-4" />
                        Awaiting verification
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {customDomain.is_verified && (
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-green-600 dark:text-green-400" />
                      {getSSLStatusBadge(customDomain.ssl_status)}
                    </div>
                  )}
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              {customDomain.is_verified && (
                <Alert>
                  <CheckCircle2 className="size-4" />
                  <AlertTitle>Domain Active</AlertTitle>
                  <AlertDescription>
                    Your application is now accessible at{" "}
                    <a
                      href={`https://${customDomain.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline"
                    >
                      https://{customDomain.domain}
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
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        Record 1: Verification (TXT)
                      </p>
                      <div className="space-y-2 font-mono text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <div className="flex items-center gap-2">
                            <span>TXT</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={() => copyToClipboard("TXT")}
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Host:</span>
                          <div className="flex items-center gap-2">
                            <span className="break-all text-xs">
                              _coderocket-verify.{customDomain.domain}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={() =>
                                copyToClipboard(
                                  `_coderocket-verify.${customDomain.domain}`,
                                )
                              }
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Value:</span>
                          <div className="flex items-center gap-2">
                            <span className="break-all text-xs">
                              {customDomain.verification_token}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={() =>
                                copyToClipboard(customDomain.verification_token)
                              }
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        Record 2: Routing (CNAME)
                      </p>
                      <div className="space-y-2 font-mono text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <div className="flex items-center gap-2">
                            <span>CNAME</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={() => copyToClipboard("CNAME")}
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Host:</span>
                          <div className="flex items-center gap-2">
                            <span className="break-all">
                              {customDomain.domain}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={() =>
                                copyToClipboard(customDomain.domain)
                              }
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Value:</span>
                          <div className="flex items-center gap-2">
                            <span>coderocket.app</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={() => copyToClipboard("coderocket.app")}
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">
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

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h4 className="mb-2 font-medium">About Custom Domains</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Use your own domain name for your deployed app</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>DNS verification required to prove domain ownership</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>One custom domain per project</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-start gap-3">
              <Shield className="size-5 shrink-0 text-green-500" />
              <div className="flex-1">
                <p className="font-medium text-green-700 dark:text-green-400">
                  Automatic HTTPS / SSL
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
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
