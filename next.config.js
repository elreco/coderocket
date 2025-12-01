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
