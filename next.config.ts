import type { NextConfig } from "next";
import { withAxiom } from 'next-axiom';

const nextConfig: NextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Augmente la limite à 10MB pour gérer les photos de 5MB
    },
  },
};

export default withAxiom(nextConfig);
