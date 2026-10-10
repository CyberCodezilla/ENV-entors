/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  transpilePackages: ['@heatflood/shared'],
  experimental: { typedRoutes: true },
};

export default nextConfig;
