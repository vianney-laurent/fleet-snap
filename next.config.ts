import type { NextConfig } from "next";
import { withAxiom } from 'next-axiom';

const nextConfig: NextConfig = {
  /* config options here */

  // Configuration pour gérer les gros uploads
  experimental: {
    // Configuration pour Next.js 15
    serverComponentsExternalPackages: ['formidable'],
  },

  // Ignorer les Edge Functions Supabase lors du build
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Ignorer les fichiers Supabase et scripts
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/supabase/**', '**/scripts/**', '**/.git/**']
    };

    return config;
  },

  // Ignorer temporairement les erreurs TypeScript pour le build Vercel
  typescript: {
    ignoreBuildErrors: false,
  },

  // Configuration pour les gros uploads (géré par vercel.json)

  // Headers pour les gros uploads
  async headers() {
    return [
      {
        source: '/api/inventory/bulk',
        headers: [
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ];
  },
};

export default withAxiom(nextConfig);
