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

export async function addDomainToVercel(
  domain: string,
): Promise<VercelDomainResponse> {
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error("Vercel credentials not configured");
  }

  const url = new URL(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
  );

  if (VERCEL_TEAM_ID) {
    url.searchParams.set("teamId", VERCEL_TEAM_ID);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
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
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error("Vercel credentials not configured");
  }

  const url = new URL(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
  );

  if (VERCEL_TEAM_ID) {
    url.searchParams.set("teamId", VERCEL_TEAM_ID);
  }

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
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
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

  if (!VERCEL_TOKEN) {
    throw new Error("Vercel credentials not configured");
  }

  const url = new URL(`https://api.vercel.com/v6/domains/${domain}/config`);

  if (VERCEL_TEAM_ID) {
    url.searchParams.set("teamId", VERCEL_TEAM_ID);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
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
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error("Vercel credentials not configured");
  }

  const url = new URL(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
  );

  if (VERCEL_TEAM_ID) {
    url.searchParams.set("teamId", VERCEL_TEAM_ID);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
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
