/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: [],
  // AI SDK URL fetching loads undici dynamically, so include it in serverless bundles.
  outputFileTracingIncludes: { "/*": ["./node_modules/undici/**/*"] },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  agentRules: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
