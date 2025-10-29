export const fetchCache = "force-no-store";
export const revalidate = 0;
export const maxDuration = 300;

import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";

import { getServerIntegrations } from "./actions";
import IntegrationsClient from "./integrations-client";

export const metadata = {
  title: "Integrations - CodeRocket",
  description: "Manage your integrations and connect external services",
};

export default async function IntegrationsPage() {
  const initialIntegrations = await getServerIntegrations();

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
