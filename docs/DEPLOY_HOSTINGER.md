# Deploy Hostinger VPS

Dominio objetivo: `app.globaltradelogisticsec.com`

## Variables necesarias

Crear `/var/www/gtl-crm/.env` en el VPS:

```bash
DATABASE_URL="..."
DIRECT_URL="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://app.globaltradelogisticsec.com"
CRON_SECRET="cambia-esto"
WA_AUTH_DIR="/var/lib/gtl-crm/wa-auth"
```

## Carpetas persistentes

```bash
mkdir -p /var/www/gtl-crm /var/lib/gtl-crm/wa-auth
```

No guardar la sesion de WhatsApp dentro del build. La sesion vive en:

```bash
/var/lib/gtl-crm/wa-auth
```

## Proceso Node

El archivo `ecosystem.config.cjs` levanta el standalone de Next con PM2:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## Cron para mensajes programados

Aunque el CRM arranca un runner interno, dejar cron como respaldo:

```bash
* * * * * curl -fsS "https://app.globaltradelogisticsec.com/api/scheduled-messages/run?secret=CRON_SECRET" >/dev/null
```

Reemplazar `CRON_SECRET` por el valor real.

## DNS

En Hostinger, crear un registro `A`:

```text
app.globaltradelogisticsec.com -> 2.24.202.93
```

Luego instalar Nginx/SSL apuntando al puerto local `3000`.
