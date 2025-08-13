import type { NextConfig } from "next";
import { withAxiom } from 'next-axiom';

const nextConfig: NextConfig = {
  /* config options here */

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


};

export default withAxiom(nextConfig);
