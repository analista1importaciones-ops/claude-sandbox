/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    outputFileTracingExcludes: {
      '*': ['./.wa-auth/**/*'],
    },
  },
  output: 'standalone',
}

module.exports = nextConfig
