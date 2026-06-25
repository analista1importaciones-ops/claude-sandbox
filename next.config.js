/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    outputFileTracingExcludes: {
      '*': ['./.wa-auth/**/*', './public/wa-media/**/*'],
    },
  },
  output: 'standalone',
}

module.exports = nextConfig
