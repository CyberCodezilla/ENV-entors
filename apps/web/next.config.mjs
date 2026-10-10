/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ['@heatflood/shared'],
  experimental: { typedRoutes: true },
};

export default nextConfig;