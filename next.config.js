/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Turbopack config (Next.js 16 uses Turbopack by default)
  turbopack: {},
}

module.exports = nextConfig

