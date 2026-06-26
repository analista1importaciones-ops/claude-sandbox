/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    outputFileTracingExcludes: {
      '*': ['./.wa-auth/**/*', './public/wa-media/**/*'],
    },
  },
  output: 'standalone',
}

module.exports = nextConfig
