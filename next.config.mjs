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

  // Enable Turbopack (empty config to acknowledge migration from webpack)
  turbopack: {},
};

export default nextConfig;
