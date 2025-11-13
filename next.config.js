/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: [
        "coderocket.app",
        "www.coderocket.app",
        "*.coderocket.app",
        "localhost:4002",
      ],
    },
  },
  async redirects() {
    return [
      {
        source: '/marketplace',
        destination: '/templates',
        permanent: true,
      },
      {
        source: '/marketplace/:path*',
        destination: '/templates/:path*',
        permanent: true,
      },
    ];
  },
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium",
    "puppeteer-extra",
    "puppeteer-extra-plugin-stealth",
    "clone-deep",
  ],
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
  }
};

module.exports = nextConfig;
