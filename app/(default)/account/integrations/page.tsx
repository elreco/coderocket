export const fetchCache = "force-no-store";
export const revalidate = 0;
export const maxDuration = 800;

import { getSubscription } from "@/app/supabase-server";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { PremiumFeatureAlert } from "@/components/premium-feature-alert";

import { getServerIntegrations } from "./actions";
import IntegrationsClient from "./integrations-client";

export const metadata = {
  title: "Integrations - CodeRocket",
  description: "Manage your integrations and connect external services",
};

export default async function IntegrationsPage() {
  const [initialIntegrations, subscription] = await Promise.all([
    getServerIntegrations(),
    getSubscription(),
  ]);

  const isPremium = !!subscription;

  if (!isPremium) {
    return (
      <Container>
        <PageTitle
          title="Integrations"
          subtitle="Connect external services to add backend functionality to your generated apps. Configure once, use across all your projects."
        />
        <div className="space-y-6">
          <PremiumFeatureAlert description="Backend integrations are available for premium users only. Upgrade your plan to connect Supabase, Stripe, and other services to automatically generate full-stack applications with backend functionality." />

          <div className="bg-muted/50 rounded-lg border p-8">
            <h3 className="mb-4 text-lg font-semibold">
              What you get with Premium:
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>
                  Connect Supabase for PostgreSQL database, authentication, and
                  storage
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>
                  Automatic database migrations with one-click execution
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>
                  AI-generated backend code with type-safe database operations
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Generate full-stack applications instantly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">Coming soon:</span>
                <span className="text-muted-foreground">
                  Stripe, Vercel Blob, Resend, and OAuth providers
                </span>
              </li>
            </ul>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <PageTitle
        title="Integrations"
        subtitle="Connect external services to add backend functionality to your generated apps. Configure once, use across all your projects."
      />
      <IntegrationsClient initialIntegrations={initialIntegrations} />
    </Container>
  );
}
