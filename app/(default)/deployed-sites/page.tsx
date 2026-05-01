import { AppFooter } from "@/components/app-footer";
import { Container } from "@/components/container";
import { DeployedSiteCard } from "@/components/deployed-site-card";
import { buildAppUrl } from "@/utils/runtime-config";

import { getDeployedSites } from "../components/actions";

export const dynamic = "force-dynamic"; // Force dynamic rendering because we use cookies

export async function generateMetadata() {
  return {
    title: "Deployed Sites - CodeRocket | Tailwind AI",
    description:
      "Browse the latest deployed sites created with CodeRocket (formerly Tailwind AI). Discover live applications built by our community.",
    keywords: [
      "deployed sites",
      "live sites",
      "tailwind ai",
      "coderocket",
      "deployed applications",
    ].join(", "),
    openGraph: {
      title: "Deployed Sites - CodeRocket | Tailwind AI",
      description:
        "Browse the latest deployed sites created with CodeRocket. Discover live applications built by our community.",
      url: buildAppUrl("/deployed-sites"),
    },
    alternates: {
      canonical: buildAppUrl("/deployed-sites"),
    },
  };
}

export default async function DeployedSites() {
  const deployedSites = await getDeployedSites(16);

  return (
    <Container className="overflow-x-hidden pr-2 sm:pr-11">
      <div className="mt-14 mb-4 flex flex-col items-center justify-center space-y-4">
        <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Deployed Sites
        </h1>
        <h2 className="text-primary mb-8 text-center text-lg sm:text-xl">
          Last sites deployed by our users
        </h2>
      </div>

      {deployedSites.length > 0 && (
        <div className="grid w-full grid-cols-1 gap-4 pb-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {deployedSites.map((site) => (
            <DeployedSiteCard key={site.chat_id} site={site} />
          ))}
        </div>
      )}

      {deployedSites.length === 0 && (
        <div className="border-border bg-secondary flex min-h-[400px] w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center">
          <h3 className="mt-4 text-lg font-semibold">
            No deployed sites found
          </h3>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            No deployed sites available at the moment.
          </p>
        </div>
      )}
      <AppFooter />
    </Container>
  );
}
