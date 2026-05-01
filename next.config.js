const ensureAbsoluteUrl = (value, fallback) => {
  const candidate = value || fallback;
  if (
    candidate.startsWith("http://") ||
    candidate.startsWith("https://")
  ) {
    return candidate.replace(/\/+$/, "");
  }

  if (
    candidate.startsWith("localhost") ||
    candidate.startsWith("127.0.0.1")
  ) {
    return `http://${candidate.replace(/\/+$/, "")}`;
  }

  return `https://${candidate.replace(/\/+$/, "")}`;
};

const normalizeHost = (value) =>
  value.replace(/^https?:\/\//, "").replace(/\/+$/, "");

const appUrl = ensureAbsoluteUrl(
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL,
  "http://localhost:4002",
);
const appHost = new URL(appUrl).host;
const deploymentRootDomain = normalizeHost(
  process.env.NEXT_PUBLIC_DEPLOYMENT_ROOT_DOMAIN || "coderocket.app",
);
const previewRootDomain = normalizeHost(
  process.env.NEXT_PUBLIC_PREVIEW_ROOT_DOMAIN || "preview.coderocket.app",
);
const webcontainerRootDomain = normalizeHost(
  process.env.NEXT_PUBLIC_WEBCONTAINER_ROOT_DOMAIN ||
    "webcontainer.coderocket.app",
);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const allowedOrigins = Array.from(
  new Set(
    [
      appHost,
      deploymentRootDomain,
      `*.${deploymentRootDomain}`,
      previewRootDomain,
      `*.${previewRootDomain}`,
      webcontainerRootDomain,
      `*.${webcontainerRootDomain}`,
      "localhost:4002",
    ].filter(Boolean),
  ),
);

const remotePatterns = [
  ...(supabaseHost
    ? [
        {
          protocol: "https",
          hostname: supabaseHost,
          port: "",
          pathname: "/storage/v1/object/public/**",
        },
      ]
    : []),
  {
    protocol: "https",
    hostname: "aceternity.com",
    port: "",
    pathname: "/**",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins,
    },
  },
  async redirects() {
    return [
      {
        source: "/marketplace",
        destination: "/components",
        permanent: true,
      },
      {
        source: "/marketplace/:path*",
        destination: "/components",
        permanent: true,
      },
      {
        source: "/templates",
        destination: "/components",
        permanent: true,
      },
      {
        source: "/templates/:path*",
        destination: "/components/:path*",
        permanent: true,
      },
    ];
  },
  reactStrictMode: false,
  images: {
    remotePatterns,
  },
};

module.exports = nextConfig;
