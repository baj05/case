import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship TypeScript source rather than a build step, so the
  // app compiles them. Keeps the prototype free of a separate build pipeline.
  transpilePackages: ['@lexhall/core', '@lexhall/db'],
  images: {
    // Advocate portraits are downloaded to our own origin during ingestion, so
    // no remote hosts are needed. Anything remote would be an accident.
    remotePatterns: [],
    formats: ['image/webp'],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default config;
