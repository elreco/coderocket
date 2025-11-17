import { SiSupabase } from "@icons-pack/react-simple-icons";
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
  SupabaseIntegrationConfig,
  UserIntegration,
  IntegrationTestResult,
} from "@/utils/integrations";

import {
  createIntegration,
  testConnection,
  updateIntegration,
} from "./actions";

interface SupabaseConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingIntegration?: UserIntegration;
}

export function SupabaseConfigDialog({
  open,
  onOpenChange,
  onSuccess,
  existingIntegration,
}: SupabaseConfigDialogProps) {
  const isEditing = !!existingIntegration;

  const [name, setName] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [projectId, setProjectId] = useState("");

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
        const config = existingIntegration.config as SupabaseIntegrationConfig;
        setProjectUrl(config?.projectUrl || "");
        setAnonKey(config?.anonKey || "");
        setAccessToken(config?.accessToken || "");
        setProjectId(config?.projectId || "");
      } else {
        setName("");
        setProjectUrl("");
        setAnonKey("");
        setAccessToken("");
        setProjectId("");
      }
      setTestResult(null);
      setError(null);
    }
  }, [open, existingIntegration]);

  const handleOAuthConnect = async () => {
    setIsConnectingOAuth(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/supabase/oauth");
      const data = await response.json();

      if (data.error) {
        if (data.error === "Supabase OAuth not configured") {
          setError(
            "Supabase OAuth is not configured. Please use manual token configuration below.",
          );
        } else {
          setError(data.error);
        }
        setIsConnectingOAuth(false);
        return;
      }

      window.location.href = data.authUrl;
    } catch {
      setError("Failed to initiate Supabase OAuth");
      setIsConnectingOAuth(false);
    }
  };

  const handleTestConnection = async () => {
    if (!projectUrl || !anonKey) {
      setError("Project URL and Anon Key are required");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    const config: SupabaseIntegrationConfig = {
      projectUrl,
      anonKey,
      accessToken: accessToken || undefined,
      projectId: projectId || undefined,
    };

    const result = await testConnection(IntegrationType.SUPABASE, config);
    setTestResult(result);
    setIsTesting(false);
  };

  const handleSubmit = async () => {
    if (!name || !projectUrl || !anonKey) {
      setError("Name, Project URL, and Anon Key are required");
      return;
    }

    setIsLoading(true);
    setError(null);

    const config: SupabaseIntegrationConfig = {
      projectUrl,
      anonKey,
      accessToken: accessToken || undefined,
      projectId: projectId || undefined,
    };

    let result;
    if (isEditing && existingIntegration) {
      result = await updateIntegration(existingIntegration.id, {
        name,
        config,
      });
    } else {
      result = await createIntegration(IntegrationType.SUPABASE, name, config);
    }

    setIsLoading(false);

    if (result.success) {
      setName("");
      setProjectUrl("");
      setAnonKey("");
      setAccessToken("");
      setProjectId("");
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
            <SiSupabase className="size-5 text-green-600" />
            {isEditing
              ? "Edit"
              : "Add"} Supabase Integration
          </DialogTitle>
          <DialogDescription>
            Connect your Supabase project to enable backend functionality in
            your generated apps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isEditing && (
            <>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <SiSupabase className="size-4 text-green-600" />
                  <h3 className="text-sm font-medium text-green-900">
                    Option 1: Connect with OAuth (Recommended)
                  </h3>
                </div>
                <p className="mb-3 text-xs text-green-700">
                  Securely connect your Supabase account with one click. This
                  will automatically retrieve your project credentials.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOAuthConnect}
                  disabled={isConnectingOAuth}
                  className="w-full border-green-300 text-green-700 hover:bg-green-700"
                >
                  {isConnectingOAuth ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <SiSupabase className="mr-2 size-4" />
                  )}
                  Connect with Supabase
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
              placeholder="e.g., My Blog Database"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              A friendly name to identify this integration
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectUrl">Project URL *</Label>
            <Input
              id="projectUrl"
              type="url"
              placeholder="https://xxxxx.supabase.co"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
            />
            <div className="text-muted-foreground flex items-start gap-2 text-xs">
              <p className="flex-1">Found in your Supabase project settings</p>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-600 hover:underline"
              >
                Open Dashboard
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="anonKey">Anon Key *</Label>
            <Input
              id="anonKey"
              type="password"
              placeholder="eyJhbG..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Public key for client-side operations
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">
              Supabase Access Token (Optional)
            </Label>
            <Input
              id="accessToken"
              type="password"
              placeholder="sbp_..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Required for automatic migrations. Generate it in Supabase
              Dashboard → Account → Access Tokens
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectId">Project ID (Optional)</Label>
            <Input
              id="projectId"
              placeholder="abcdefghijklmnop"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Required for migrations. Find it in your project URL (the part
              before .supabase.co)
            </p>
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
                {testResult.success && testResult.details && (
                  <p className="mt-1 text-xs opacity-80">
                    Latency: {testResult.details.latency}ms
                  </p>
                )}
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
            disabled={isTesting || !projectUrl || !anonKey}
          >
            {isTesting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !name || !projectUrl || !anonKey}
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? "Update" : "Create"} Integration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
