/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  env: {
    ENABLE_EDGE_FUNCTIONS: process.env.ENABLE_EDGE_FUNCTIONS,
    NEXT_PUBLIC_ENABLE_EDGE_FUNCTIONS: process.env.ENABLE_EDGE_FUNCTIONS,
    SUPABASE_EDGE_FUNCTIONS_URL: process.env.NEXT_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL,
  },

  async rewrites() {
    return [
      {
        source: '/api/edge/:path*',
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL}/:path*`
      }
    ]
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
}

module.exports = nextConfig
