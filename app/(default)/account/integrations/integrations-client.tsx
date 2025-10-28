"use client";

import { Plus, Database, CreditCard, Mail, Plug2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IntegrationType, UserIntegration } from "@/utils/integrations";

import { fetchUserIntegrations } from "./actions";
import { IntegrationCard } from "./integration-card";
import { SupabaseConfigDialog } from "./supabase-config-dialog";

const availableIntegrations = [
  {
    type: IntegrationType.SUPABASE,
    name: "Supabase",
    description: "PostgreSQL database, authentication, and storage",
    icon: <Database className="size-6 text-green-600" />,
    available: true,
  },
  {
    type: IntegrationType.STRIPE,
    name: "Stripe",
    description: "Payment processing and subscriptions",
    icon: <CreditCard className="size-6 text-purple-600" />,
    available: false,
  },
  {
    type: IntegrationType.BLOB,
    name: "Vercel Blob",
    description: "File storage and CDN",
    icon: <Database className="size-6 text-blue-600" />,
    available: false,
  },
  {
    type: IntegrationType.RESEND,
    name: "Resend",
    description: "Transactional email delivery",
    icon: <Mail className="size-6 text-orange-600" />,
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

export default function IntegrationsClient() {
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseDialogOpen, setSupabaseDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] =
    useState<UserIntegration | null>(null);

  const loadIntegrations = async () => {
    setIsLoading(true);
    const data = await fetchUserIntegrations();
    setIntegrations(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleAddIntegration = (type: IntegrationType) => {
    if (type === IntegrationType.SUPABASE) {
      setEditingIntegration(null);
      setSupabaseDialogOpen(true);
    }
  };

  const handleEditIntegration = (integration: UserIntegration) => {
    if (integration.integration_type === IntegrationType.SUPABASE) {
      setEditingIntegration(integration);
      setSupabaseDialogOpen(true);
    }
  };

  const handleDialogSuccess = () => {
    setSupabaseDialogOpen(false);
    setEditingIntegration(null);
    loadIntegrations();
  };

  const handleDialogClose = (open: boolean) => {
    setSupabaseDialogOpen(open);
    if (!open) {
      setEditingIntegration(null);
    }
  };

  const userHasIntegrationType = (type: IntegrationType) => {
    return integrations.some((i) => i.integration_type === type);
  };

  const canAddMoreOfType = (type: IntegrationType) => {
    return type === IntegrationType.SUPABASE;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Integrations</h2>
          <p className="text-sm text-muted-foreground">
            {integrations.length === 0
              ? "No integrations configured yet. Add one below to get started."
              : `${integrations.length} integration${integrations.length > 1 ? "s" : ""} configured`}
          </p>
        </div>
        <Button
          onClick={() => handleAddIntegration(IntegrationType.SUPABASE)}
          className="gap-2"
        >
          <Plus className="size-4" />
          Add Integration
        </Button>
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
                  <div className="rounded-lg border bg-background p-2">
                    {integration.icon}
                  </div>
                  {!integration.available && (
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
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
        onOpenChange={handleDialogClose}
        onSuccess={handleDialogSuccess}
        existingIntegration={editingIntegration || undefined}
      />
    </div>
  );
}
