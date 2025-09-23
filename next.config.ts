import type { NextConfig } from "next";
import { withAxiom } from 'next-axiom';

const nextConfig: NextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Limite globale pour les API routes
    },
  },
  experimental: {
    isrMemoryCacheSize: 0, // Optimisation mémoire pour les uploads
  },
  // Configuration pour les images
  images: {
    domains: ['prxiodbinnxncvbvzuux.supabase.co'], // Domaine Supabase pour les images
  },
};

export default withAxiom(nextConfig);
