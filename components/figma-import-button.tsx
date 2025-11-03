import { SiFigma } from "@icons-pack/react-simple-icons";
import { Loader2, ExternalLink, Download, Crown } from "lucide-react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";

interface FigmaImportButtonProps {
  disabled?: boolean;
  onFileImport: (file: File) => void;
  framework?: string;
  subscription?:
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null;
  isLoggedIn?: boolean;
  isReverse?: boolean;
  isUploading?: boolean;
}

interface FigmaIntegration {
  id: string;
  name: string;
  integration_type: string;
}

export function FigmaImportButton({
  disabled = false,
  onFileImport,
  framework = "html",
  subscription = null,
  isLoggedIn = true,
  isReverse = false,
  isUploading = false,
}: FigmaImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [integrations, setIntegrations] = useState<FigmaIntegration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);

  const isPremium = !!subscription;

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setIsLoadingIntegrations(true);
    try {
      const response = await fetch("/api/integrations");
      if (response.ok) {
        const data = await response.json();
        const figmaIntegrations = data.integrations.filter(
          (i: FigmaIntegration) => i.integration_type === "figma",
        );
        setIntegrations(figmaIntegrations);
        if (figmaIntegrations.length > 0) {
          setSelectedIntegration(figmaIntegrations[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading integrations:", error);
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  const extractFileKey = (url: string): string | null => {
    const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const handleImport = async () => {
    if (!selectedIntegration) {
      toast({
        variant: "destructive",
        title: "No integration selected",
        description: "Please select a Figma integration",
      });
      return;
    }

    if (!figmaUrl) {
      toast({
        variant: "destructive",
        title: "No URL provided",
        description: "Please enter a Figma file URL",
      });
      return;
    }

    const fileKey = extractFileKey(figmaUrl);
    if (!fileKey) {
      toast({
        variant: "destructive",
        title: "Invalid Figma URL",
        description: "Please enter a valid Figma file URL",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/integrations/figma/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          integrationId: selectedIntegration,
          fileKey,
          framework,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to convert Figma design");
      }

      const data = await response.json();

      if (data.success && data.code) {
        const blob = new Blob([data.code], { type: "text/plain" });
        const fileName = `figma-design-${Date.now()}.txt`;
        const file = new File([blob], fileName, { type: "text/plain" });

        onFileImport(file);

        toast({
          title: "Design imported successfully",
          description: "The Figma design has been added as a file attachment",
        });

        setIsOpen(false);
        setFigmaUrl("");
      }
    } catch (error) {
      console.error("Error importing Figma design:", error);
      toast({
        variant: "destructive",
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Failed to import design",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    if (!isLoggedIn) {
      toast({
        title: "Login required",
        description:
          "Sign in to import Figma designs and streamline your workflow!",
        action: (
          <a
            href="/login"
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
          >
            Login
          </a>
        ),
        duration: 5000,
      });
      return;
    }

    if (!isPremium) {
      toast({
        title: "Premium feature",
        description:
          "Unlock Figma integration and accelerate your development with AI-powered design imports!",
        action: (
          <a
            href="/pricing"
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
          >
            Upgrade
          </a>
        ),
        duration: 5000,
      });
      return;
    }

    setIsOpen(true);
  };

  return (
    <>
      <Button
        variant={isReverse ? "background" : "secondary"}
        className="w-full transition-all duration-200 lg:w-auto"
        size="sm"
        type="button"
        disabled={disabled || isUploading || isLoading}
        onClick={handleOpenDialog}
        title={
          !isLoggedIn
            ? "Login to unlock Figma integration"
            : !isPremium
              ? "Upgrade to Premium to unlock Figma integration"
              : "Import design from Figma"
        }
      >
        {isUploading || isLoading ? (
          <>
            <Loader2 className="size-3 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            <SiFigma className="size-3 text-[#F24E1E]" />
            <span>Figma</span>
            {(!isLoggedIn || !isPremium) && (
              <Crown className="size-3 text-amber-500" />
            )}
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SiFigma className="size-5 text-purple-600" />
              Import from Figma
            </DialogTitle>
            <DialogDescription>
              Import a Figma design and convert it to code automatically
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoadingIntegrations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : integrations.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm font-medium text-yellow-900">
                    No Figma integration found
                  </p>
                  <p className="mt-1 text-sm text-yellow-800">
                    Please connect your Figma account to import designs.
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <a
                    href="/account/integrations"
                    className="inline-flex items-center gap-2"
                  >
                    <ExternalLink className="size-4" />
                    Configure Figma Integration
                  </a>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="integration">Figma Account</Label>
                  <Select
                    value={selectedIntegration}
                    onValueChange={setSelectedIntegration}
                  >
                    <SelectTrigger id="integration">
                      <SelectValue placeholder="Select an integration" />
                    </SelectTrigger>
                    <SelectContent>
                      {integrations.map((integration) => (
                        <SelectItem key={integration.id} value={integration.id}>
                          {integration.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="figmaUrl">Figma File URL</Label>
                  <Input
                    id="figmaUrl"
                    type="url"
                    placeholder="https://www.figma.com/file/..."
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the URL of the Figma file you want to import
                  </p>
                </div>

                <div className="rounded-lg border bg-muted p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> The converter will extract the design
                    structure and convert it to {framework.toUpperCase()} code.
                    Complex designs may require manual adjustments.
                  </p>
                </div>
              </>
            )}
          </div>

          {!isLoadingIntegrations && integrations.length > 0 && (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={isLoading || !selectedIntegration || !figmaUrl}
              >
                {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                <Download className="mr-2 size-4" />
                Import Design
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
