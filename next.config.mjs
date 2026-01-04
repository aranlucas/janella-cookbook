/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["jsdom"], // Add the name of the problematic module here
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
