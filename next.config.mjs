/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
