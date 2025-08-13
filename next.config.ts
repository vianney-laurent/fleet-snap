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

  // Ignorer les erreurs TypeScript pour les Edge Functions
  typescript: {
    ignoreBuildErrors: false,
  },

  // Exclure certains dossiers du build
  experimental: {
    outputFileTracingIgnores: ['supabase/**/*', 'scripts/**/*']
  }
};

export default withAxiom(nextConfig);
