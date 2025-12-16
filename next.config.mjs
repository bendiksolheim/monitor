/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable standalone mode since we use custom server
  output: undefined,

  // Disable default request logging (using custom logger instead)
  logging: {
    incomingRequests: false,
  },

  // Keep PostCSS config for Mantine
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },

  // Disable webpack build warnings for worker files
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude job files from main bundle
      config.externals = [...(config.externals || []), "bree"];
    }
    return config;
  },
};

export default nextConfig;
