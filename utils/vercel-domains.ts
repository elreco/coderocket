import {
  domainApiEnabled,
  vercelProjectId,
  vercelTeamId,
  vercelToken,
} from "./server-config";

interface VercelDomainResponse {
  name: string;
  verified: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
}

interface VercelConfigResponse {
  configuredBy?: string;
  acceptedChallenges?: string[];
  misconfigured: boolean;
}

const assertVercelDomainApiConfigured = () => {
  if (!domainApiEnabled) {
    throw new Error(
      "Custom domains are configured for self-host mode. Configure DNS and SSL in your hosting environment or set DOMAIN_PROVIDER=vercel.",
    );
  }

  if (!vercelToken || !vercelProjectId) {
    throw new Error("Vercel credentials not configured");
  }
};

export async function addDomainToVercel(
  domain: string,
): Promise<VercelDomainResponse> {
  assertVercelDomainApiConfigured();

  const url = new URL(
    `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
  );

  if (vercelTeamId) {
    url.searchParams.set("teamId", vercelTeamId);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: domain,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to add domain to Vercel");
  }

  const data = await response.json();
  return data;
}

export async function removeDomainFromVercel(domain: string): Promise<void> {
  assertVercelDomainApiConfigured();

  const url = new URL(
    `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
  );

  if (vercelTeamId) {
    url.searchParams.set("teamId", vercelTeamId);
  }

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${vercelToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.error?.message || "Failed to remove domain from Vercel",
    );
  }
}

export async function verifyDomainOnVercel(
  domain: string,
): Promise<VercelConfigResponse> {
  if (!domainApiEnabled) {
    throw new Error(
      "Domain verification is managed by your hosting environment in self-host mode.",
    );
  }

  if (!vercelToken) {
    throw new Error("Vercel credentials not configured");
  }

  const url = new URL(`https://api.vercel.com/v6/domains/${domain}/config`);

  if (vercelTeamId) {
    url.searchParams.set("teamId", vercelTeamId);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${vercelToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.error?.message || "Failed to verify domain on Vercel",
    );
  }

  const data = await response.json();
  return data;
}

export async function checkVercelDomainStatus(
  domain: string,
): Promise<VercelDomainResponse> {
  assertVercelDomainApiConfigured();

  const url = new URL(
    `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
  );

  if (vercelTeamId) {
    url.searchParams.set("teamId", vercelTeamId);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${vercelToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.error?.message || "Failed to check domain status on Vercel",
    );
  }

  const data = await response.json();
  return data;
}
