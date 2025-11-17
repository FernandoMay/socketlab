/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: false,
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  async rewrites() {
    return [
      {
        source: '/api/socket.io/:path*',
        destination: 'http://localhost:3001/socket.io/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3001/socket.io/:path*',
      }
    ];
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Custom webpack configuration for development
    if (!dev) {
      return config;
    }
    
    return {
      ...config,
      resolve: {
        ...config.resolve,
        fallback: {
          fs: false,
          path: false,
          os: false,
        },
      },
    };
  },
}

module.exports = nextConfig