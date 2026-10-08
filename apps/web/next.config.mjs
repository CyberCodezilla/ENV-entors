/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  transpilePackages: ['@heatflood/shared'],
  experimental: { typedRoutes: true },
};

export default nextConfig;
