import { SiFigma } from "@icons-pack/react-simple-icons";
import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
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
  IntegrationType,
  FigmaIntegrationConfig,
  UserIntegration,
  IntegrationTestResult,
} from "@/utils/integrations";

import {
  createIntegration,
  testConnection,
  updateIntegration,
} from "./actions";

interface FigmaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingIntegration?: UserIntegration;
}

export function FigmaConfigDialog({
  open,
  onOpenChange,
  onSuccess,
  existingIntegration,
}: FigmaConfigDialogProps) {
  const isEditing = !!existingIntegration;

  const [name, setName] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [testResult, setTestResult] = useState<IntegrationTestResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingIntegration) {
        setName(existingIntegration.name || "");
        const config = existingIntegration.config as FigmaIntegrationConfig;
        setAccessToken(config?.accessToken || "");
      } else {
        setName("");
        setAccessToken("");
      }
      setTestResult(null);
      setError(null);
    }
  }, [open, existingIntegration]);

  const handleOAuthConnect = async () => {
    setIsConnectingOAuth(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/figma/oauth");
      const data = await response.json();

      if (data.error) {
        if (data.error === "Figma OAuth not configured") {
          setError(
            "Figma OAuth is not configured. Please use manual token configuration below.",
          );
        } else {
          setError(data.error);
        }
        setIsConnectingOAuth(false);
        return;
      }

      window.location.href = data.authUrl;
    } catch {
      setError("Failed to initiate Figma OAuth");
      setIsConnectingOAuth(false);
    }
  };

  const handleTestConnection = async () => {
    if (!accessToken) {
      setError("Access token is required");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    const config: FigmaIntegrationConfig = {
      accessToken,
      features: {
        importDesigns: true,
        exportCode: true,
        syncUpdates: true,
      },
    };

    const result = await testConnection(IntegrationType.FIGMA, config);
    setTestResult(result);
    setIsTesting(false);
  };

  const handleSubmit = async () => {
    if (!name || !accessToken) {
      setError("Name and Access Token are required");
      return;
    }

    setIsLoading(true);
    setError(null);

    const config: FigmaIntegrationConfig = {
      accessToken,
      features: {
        importDesigns: true,
        exportCode: true,
        syncUpdates: true,
      },
    };

    let result;
    if (isEditing && existingIntegration) {
      result = await updateIntegration(existingIntegration.id, {
        name,
        config,
      });
    } else {
      result = await createIntegration(IntegrationType.FIGMA, name, config);
    }

    setIsLoading(false);

    if (result.success) {
      setName("");
      setAccessToken("");
      setTestResult(null);
      setError(null);
      onOpenChange(false);
      onSuccess();
    } else {
      setError(result.error || "Failed to save integration");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiFigma className="size-5 text-purple-600" />
            {isEditing
              ? "Edit"
              : "Add"} Figma Integration
          </DialogTitle>
          <DialogDescription>
            Connect your Figma account to import designs and convert them to
            code automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isEditing && (
            <>
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <SiFigma className="size-4 text-purple-600" />
                  <h3 className="text-sm font-medium text-purple-900">
                    Option 1: Connect with OAuth (Recommended)
                  </h3>
                </div>
                <p className="mb-3 text-xs text-purple-700">
                  Securely connect your Figma account with one click. This will
                  automatically retrieve your access token.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOAuthConnect}
                  disabled={isConnectingOAuth}
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-600"
                >
                  {isConnectingOAuth ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <SiFigma className="mr-2 size-4" />
                  )}
                  Connect with Figma
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">
                    Or configure manually
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Integration Name *</Label>
            <Input
              id="name"
              placeholder="e.g., My Figma Workspace"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              A friendly name to identify this integration
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">Personal Access Token *</Label>
            <Input
              id="accessToken"
              type="password"
              placeholder="figd_..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <div className="space-y-1">
              <div className="text-muted-foreground flex items-start gap-2 text-xs">
                <p className="flex-1">
                  Generate a token in your Figma account settings
                </p>
                <a
                  href="https://www.figma.com/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-600 hover:underline"
                >
                  Open Settings
                  <ExternalLink className="size-3" />
                </a>
              </div>
              <p className="text-muted-foreground text-xs">
                Required scopes: <strong>current_user:read</strong> and{" "}
                <strong>file_content:read</strong>
              </p>
            </div>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-md border p-3 ${
                testResult.success
                  ? "border-green-200 bg-green-50 text-green-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{testResult.message}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
              <XCircle className="mt-0.5 size-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || !accessToken}
          >
            {isTesting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !name || !accessToken}
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? "Update" : "Create"} Integration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
