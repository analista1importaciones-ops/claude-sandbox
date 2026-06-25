module.exports = {
  apps: [
    {
      name: 'gtl-crm',
      cwd: '/var/www/gtl-crm',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        WA_AUTH_DIR: '/var/lib/gtl-crm/wa-auth',
      },
      max_memory_restart: '700M',
      autorestart: true,
      watch: false,
    },
  ],
}
