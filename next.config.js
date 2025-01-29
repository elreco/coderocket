/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jojdwiugelqhcajbccxn.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'aceternity.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/:slug*",
        has: [{ type: "host", value: "(?<prefix>.+)\\.dev\\.tailwindai\\.dev" }],
        destination: "/webcontainer/:prefix/:slug*",
      },
    ];
  },
};

module.exports = nextConfig;
