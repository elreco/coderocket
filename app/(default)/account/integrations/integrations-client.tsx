"use client";

import {
  SiSupabase,
  SiStripe,
  SiVercel,
  SiMailgun,
  SiFigma,
} from "@icons-pack/react-simple-icons";
import { Plus, Plug2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { IntegrationType, UserIntegration } from "@/utils/integrations";

import { fetchUserIntegrations } from "./actions";
import { FigmaConfigDialog } from "./figma-config-dialog";
import { IntegrationCard } from "./integration-card";
import { SupabaseConfigDialog } from "./supabase-config-dialog";

const availableIntegrations = [
  {
    type: IntegrationType.SUPABASE,
    name: "Supabase",
    description: "PostgreSQL database, authentication, and storage",
    icon: <SiSupabase className="size-6 text-green-600" />,
    available: true,
  },
  {
    type: IntegrationType.FIGMA,
    name: "Figma",
    description: "Import designs and convert to code automatically",
    icon: <SiFigma className="size-6 text-purple-600" />,
    available: true,
  },
  {
    type: IntegrationType.STRIPE,
    name: "Stripe",
    description: "Payment processing and subscriptions",
    icon: <SiStripe className="size-6 text-purple-600" />,
    available: false,
  },
  {
    type: IntegrationType.BLOB,
    name: "Vercel Blob",
    description: "File storage and CDN",
    icon: <SiVercel className="size-6 text-blue-600" />,
    available: false,
  },
  {
    type: IntegrationType.RESEND,
    name: "Resend",
    description: "Transactional email delivery",
    icon: <SiMailgun className="size-6 text-orange-600" />,
    available: false,
  },
  {
    type: IntegrationType.AUTH,
    name: "Authentication",
    description: "OAuth providers (Google, GitHub, etc.)",
    icon: <Plug2 className="size-6 text-indigo-600" />,
    available: false,
  },
];

interface IntegrationsClientProps {
  initialIntegrations: UserIntegration[];
}

export default function IntegrationsClient({
  initialIntegrations,
}: IntegrationsClientProps) {
  const [integrations, setIntegrations] =
    useState<UserIntegration[]>(initialIntegrations);
  const [supabaseDialogOpen, setSupabaseDialogOpen] = useState(false);
  const [figmaDialogOpen, setFigmaDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] =
    useState<UserIntegration | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  const loadIntegrations = useCallback(async () => {
    const data = await fetchUserIntegrations();
    setIntegrations(data);
  }, []);

  useEffect(() => {
    const error = searchParams.get("error");
    const success = searchParams.get("success");
    const message = searchParams.get("message");

    if (error) {
      const errorMessages: Record<string, string> = {
        no_code: "No authorization code received",
        not_configured: "Integration not properly configured",
        unauthorized: "You must be logged in",
        invalid_state: "Invalid state parameter - security check failed",
        token_exchange_failed:
          "Failed to exchange authorization code for token",
        no_projects: "No projects found in your account",
        no_project_ref: "Project reference not found",
        keys_fetch_failed: "Failed to fetch API keys",
        no_anon_key: "No anonymous key found in project",
        save_failed: message || "Failed to save integration",
        callback_failed: "OAuth callback failed",
        invalid_data: "Invalid data received",
        expired: "Session expired, please try again",
        all_projects_connected:
          "All your Supabase projects are already connected",
        already_connected:
          "This account is already connected. Please edit the existing integration instead.",
      };

      toast({
        variant: "destructive",
        title: "Integration Error",
        description: errorMessages[error] || `Error: ${error}`,
      });

      router.replace("/account/integrations");
    } else if (success) {
      const successMessages: Record<string, string> = {
        supabase_connected: "Supabase integration connected successfully!",
        figma_connected: "Figma integration connected successfully!",
      };

      toast({
        title: "Success",
        description: successMessages[success] || "Integration connected!",
      });

      loadIntegrations();
      router.replace("/account/integrations");
    }
  }, [searchParams, router, loadIntegrations]);

  const handleAddIntegration = (type: IntegrationType) => {
    setEditingIntegration(null);
    if (type === IntegrationType.SUPABASE) {
      setSupabaseDialogOpen(true);
    } else if (type === IntegrationType.FIGMA) {
      setFigmaDialogOpen(true);
    }
  };

  const handleEditIntegration = (integration: UserIntegration) => {
    setEditingIntegration(integration);
    if (integration.integration_type === IntegrationType.SUPABASE) {
      setSupabaseDialogOpen(true);
    } else if (integration.integration_type === IntegrationType.FIGMA) {
      setFigmaDialogOpen(true);
    }
  };

  const handleDialogSuccess = () => {
    setSupabaseDialogOpen(false);
    setFigmaDialogOpen(false);
    setEditingIntegration(null);
    loadIntegrations();
  };

  const handleDialogClose = (open: boolean, type: "supabase" | "figma") => {
    if (type === "supabase") {
      setSupabaseDialogOpen(open);
    } else if (type === "figma") {
      setFigmaDialogOpen(open);
    }
    if (!open) {
      setEditingIntegration(null);
    }
  };

  const userHasIntegrationType = (type: IntegrationType) => {
    return integrations.some((i) => i.integration_type === type);
  };

  const canAddMoreOfType = (type: IntegrationType) => {
    return type === IntegrationType.SUPABASE || type === IntegrationType.FIGMA;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Integrations</h2>
          <p className="text-muted-foreground text-sm">
            {integrations.length === 0
              ? "No integrations configured yet. Add one below to get started."
              : `${integrations.length} integration${integrations.length > 1 ? "s" : ""} configured`}
          </p>
        </div>
      </div>

      {integrations.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onEdit={handleEditIntegration}
              onDelete={loadIntegrations}
            />
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Available Integrations</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableIntegrations.map((integration) => (
            <Card
              key={integration.type}
              className={
                !integration.available ? "opacity-60" : "hover:shadow-md"
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="bg-background rounded-lg border p-2">
                    {integration.icon}
                  </div>
                  {!integration.available && (
                    <span className="bg-muted rounded-full px-2 py-1 text-xs font-medium">
                      Coming Soon
                    </span>
                  )}
                </div>
                <CardTitle className="mt-4">{integration.name}</CardTitle>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleAddIntegration(integration.type)}
                  disabled={
                    !integration.available ||
                    (userHasIntegrationType(integration.type) &&
                      !canAddMoreOfType(integration.type))
                  }
                  className="w-full"
                >
                  <Plus className="mr-2 size-4" />
                  {userHasIntegrationType(integration.type) &&
                  !canAddMoreOfType(integration.type)
                    ? "Already Added"
                    : "Add Integration"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <SupabaseConfigDialog
        open={supabaseDialogOpen}
        onOpenChange={(open) => handleDialogClose(open, "supabase")}
        onSuccess={handleDialogSuccess}
        existingIntegration={editingIntegration || undefined}
      />

      <FigmaConfigDialog
        open={figmaDialogOpen}
        onOpenChange={(open) => handleDialogClose(open, "figma")}
        onSuccess={handleDialogSuccess}
        existingIntegration={editingIntegration || undefined}
      />
    </div>
  );
}
