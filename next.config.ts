import type { NextConfig } from "next";
import { withAxiom } from 'next-axiom';

const nextConfig: NextConfig = {
  /* config options here */

  // Configuration pour gérer les gros uploads
  experimental: {
    // Augmenter la limite de taille des requêtes
    isrMemoryCacheSize: 0,
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

  // Configuration des API routes pour les gros uploads
  serverRuntimeConfig: {
    maxRequestSize: '50mb'
  },

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
