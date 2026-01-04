/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["jsdom"],
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
