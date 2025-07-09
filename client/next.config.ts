import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['wagmi', '@privy-io/react-auth'],
  },
  webpack: (config, { isServer, webpack }) => {
    // Handle client-side only modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        'pino-pretty': false,
        path: false,
        os: false,
        stream: false,
      };
    }
    
    // Ignore pino-pretty in client builds
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pino-pretty$/,
      })
    );
    
    // Ignore source map warnings for node_modules
    config.ignoreWarnings = [
      /Failed to parse source map/,
      /Source map error/,
    ];
    
    return config;
  },
};

export default nextConfig;
