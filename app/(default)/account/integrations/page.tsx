import { PageTitle } from "@/components/page-title";

import IntegrationsClient from "./integrations-client";

export const metadata = {
  title: "Integrations - CodeRocket",
  description: "Manage your integrations and connect external services",
};

export default function IntegrationsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <PageTitle title="Integrations" />
      <p className="text-muted-foreground">
        Connect external services to add backend functionality to your generated
        apps. Configure once, use across all your projects.
      </p>
      <IntegrationsClient />
    </div>
  );
}
