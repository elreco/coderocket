"use client";

import { SiSupabase } from "@icons-pack/react-simple-icons";
import { Plug2, Plus, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchUserIntegrations,
  getChatIntegrations,
  enableChatIntegration,
  disableChatIntegration,
} from "@/app/(default)/account/integrations/actions";
import { getSubscription } from "@/app/supabase-server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IntegrationBadge } from "@/components/ui/integration-badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useComponentContext } from "@/context/component-context";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/types_db";
import {
  IntegrationType,
  UserIntegration,
  ChatIntegrationWithDetails,
} from "@/utils/integrations";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"] & {
  prices: Database["public"]["Tables"]["prices"]["Row"] & {
    products: Database["public"]["Tables"]["products"]["Row"];
  };
};

export default function IntegrationsContent() {
  const { chatId, user } = useComponentContext();
  const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>(
    [],
  );
  const [chatIntegrations, setChatIntegrations] = useState<
    ChatIntegrationWithDetails[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedIntegrations, setSelectedIntegrations] = useState<
    Map<IntegrationType, string>
  >(new Map());

  const isPremium = !!subscription;

  const loadData = async () => {
    if (!user) return;

    setIsLoading(true);
    const [allIntegrations, enabledIntegrations, subscriptionData] =
      await Promise.all([
        fetchUserIntegrations(),
        getChatIntegrations(chatId),
        getSubscription(),
      ]);

    setUserIntegrations(allIntegrations);
    setChatIntegrations(enabledIntegrations);
    setSubscription(subscriptionData as Subscription | null);

    const selected = new Map<IntegrationType, string>();
    enabledIntegrations.forEach((ci) => {
      selected.set(ci.user_integrations.integration_type, ci.integration_id);
    });
    setSelectedIntegrations(selected);

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user, chatId]);

  const handleToggleIntegration = async (
    type: IntegrationType,
    enabled: boolean,
  ) => {
    const integrationsOfType = getIntegrationsOfType(type);
    const integrationId =
      selectedIntegrations.get(type) || integrationsOfType[0]?.id;

    if (!integrationId) {
      toast({
        variant: "destructive",
        title: "No integration available",
        description: "Please configure an integration in settings first",
      });
      return;
    }

    if (enabled) {
      const result = await enableChatIntegration(chatId, integrationId);
      if (result.success) {
        toast({
          title: "Integration enabled",
          description: "The integration is now active for this project",
        });
        loadData();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to enable integration",
          description: result.error,
        });
      }
    } else {
      const result = await disableChatIntegration(chatId, integrationId);
      if (result.success) {
        toast({
          title: "Integration disabled",
          description: "The integration is now inactive for this project",
        });
        loadData();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to disable integration",
          description: result.error,
        });
      }
    }
  };

  const handleSelectIntegration = (type: IntegrationType, id: string) => {
    const newSelected = new Map(selectedIntegrations);
    newSelected.set(type, id);
    setSelectedIntegrations(newSelected);
  };

  const isIntegrationEnabled = (type: IntegrationType): boolean => {
    return chatIntegrations.some(
      (ci) => ci.user_integrations.integration_type === type,
    );
  };

  const getIntegrationsOfType = (type: IntegrationType): UserIntegration[] => {
    return userIntegrations.filter((i) => i.integration_type === type);
  };

  if (!user) {
    return (
      <div className="p-4">
        <Alert>
          <Plug2 className="size-4" />
          <AlertDescription>
            Please login to manage integrations
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-base font-semibold">Active Integrations</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect backend services to generate full-stack applications.{" "}
            <a
              href="https://docs.coderocket.app/integrations/migrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline decoration-dotted underline-offset-4 hover:decoration-solid"
            >
              View documentation
            </a>
          </p>
        </div>
        <Alert className="border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950">
          <AlertCircle className="size-4 text-amber-600" />
          <AlertDescription>
            <p className="font-medium text-amber-900 dark:text-amber-100">
              Premium feature required
            </p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              Backend integrations are available for premium users only. Upgrade
              your plan to connect Supabase, Stripe, and other services.
            </p>
          </AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href="/pricing" className="flex items-center gap-2">
            <span>Upgrade to Premium</span>
          </Link>
        </Button>
      </div>
    );
  }

  if (userIntegrations.length === 0) {
    return (
      <div className="p-4">
        <Alert>
          <Plug2 className="size-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>No integrations configured yet.</p>
              <Button asChild size="sm" className="mt-2">
                <Link
                  href="/account/integrations"
                  className="flex items-center gap-2"
                >
                  <Plus className="size-4" />
                  Configure Integrations
                  <ExternalLink className="size-3" />
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const integrationTypes = Array.from(
    new Set(userIntegrations.map((i) => i.integration_type)),
  );

  const getIntegrationIcon = (type: IntegrationType) => {
    switch (type) {
      case IntegrationType.SUPABASE:
        return <SiSupabase className="size-4 text-green-600" />;
      default:
        return <Plug2 className="size-4" />;
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Active Integrations</h3>
          <Button asChild size="sm" variant="outline">
            <Link
              href="/account/integrations"
              className="flex items-center gap-2"
            >
              Manage
              <ExternalLink className="size-3" />
            </Link>
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect backend services to generate full-stack applications.{" "}
          <a
            href="https://docs.coderocket.app/integrations/migrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline decoration-dotted underline-offset-4 hover:decoration-solid"
          >
            View documentation
          </a>
        </p>
      </div>

      <div className="space-y-4">
        {integrationTypes.map((type) => {
          const integrationsOfType = getIntegrationsOfType(type);
          const isEnabled = isIntegrationEnabled(type);
          const selectedId = selectedIntegrations.get(type);

          return (
            <div key={type} className="space-y-2 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIntegrationIcon(type)}
                  <IntegrationBadge type={type} showIcon={false} />
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) =>
                    handleToggleIntegration(type, checked)
                  }
                />
              </div>

              {integrationsOfType.length > 1 && (
                <div className="space-y-1">
                  <Label className="text-xs">Select integration</Label>
                  <Select
                    value={selectedId || integrationsOfType[0]?.id}
                    onValueChange={(value) =>
                      handleSelectIntegration(type, value)
                    }
                    disabled={!isEnabled}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {integrationsOfType.map((integration) => (
                        <SelectItem key={integration.id} value={integration.id}>
                          {integration.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {integrationsOfType.length === 1 && isEnabled && (
                <p className="text-xs text-muted-foreground">
                  Using: {integrationsOfType[0]?.name}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Alert>
        <Plug2 className="size-4" />
        <AlertDescription className="text-xs">
          Enabled integrations will be used to generate backend code for this
          project. The AI will automatically include database operations, API
          routes, and type definitions.
        </AlertDescription>
      </Alert>
    </div>
  );
}
