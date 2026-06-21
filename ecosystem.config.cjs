module.exports = {
  apps: [
    {
      name: 'gtl-crm',
      script: '.next/standalone/server.js',
      cwd: '/var/www/gtl-crm',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '127.0.0.1',
        WA_AUTH_DIR: '/var/lib/gtl-crm/wa-auth',
      },
    },
  ],
}
