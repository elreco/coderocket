/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        "source": "/storage/v1/object/public/(.*)",
        "headers": [
          {
            "key": "X-Dummy-Header",
            "value": "dummy"
          }
        ]
      },
      {
        "source": "/(.*)",
        "headers": [
          {
            "key": "Cross-Origin-Embedder-Policy",
            "value": "credentialless"
          },
          {
            "key": "Cross-Origin-Opener-Policy",
            "value": "same-origin"
          }
        ]
      }
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
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
  },
};

module.exports = nextConfig;
