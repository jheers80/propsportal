import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    // Optimize for Material-UI emotion components
    emotion: true,
  },
  experimental: {
    // Enable optimized CSS loading
    optimizeCss: true,
  },
  // Transpile Material-UI packages
  transpilePackages: ['@mui/material', '@mui/system', '@mui/icons-material'],
};

export default nextConfig;
