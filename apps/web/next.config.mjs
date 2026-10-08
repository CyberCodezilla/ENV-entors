/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@heatflood/shared'],
  experimental: { typedRoutes: true },
};

export default nextConfig;
