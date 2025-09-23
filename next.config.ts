import type { NextConfig } from "next";
import { withAxiom } from 'next-axiom';

const nextConfig: NextConfig = {
  // Configuration pour les images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'prxiodbinnxncvbvzuux.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Configuration pour optimiser les performances
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
};

export default withAxiom(nextConfig);
