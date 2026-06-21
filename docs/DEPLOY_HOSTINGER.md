# Deploy CRM en crm.globaltradelogisticsec.com

## Requisito

Este CRM debe correr en un servidor Node permanente. Para WhatsApp, workflows y mensajes programados no conviene hosting estatico ni serverless que duerma.

## DNS

En Hostinger/DNS del dominio:

- Tipo: `A`
- Nombre/Host: `crm`
- Valor: IP publica del VPS
- TTL: automatico o 300

Resultado esperado:

```txt
crm.globaltradelogisticsec.com -> IP_DEL_VPS
```

## Carpetas en VPS

```bash
sudo mkdir -p /var/www/gtl-crm
sudo mkdir -p /var/lib/gtl-crm/wa-auth
sudo chown -R $USER:$USER /var/www/gtl-crm /var/lib/gtl-crm
```

## Variables de entorno

Crear `/var/www/gtl-crm/.env` con las mismas variables locales y ajustar:

```env
NEXTAUTH_URL=https://crm.globaltradelogisticsec.com
WA_AUTH_DIR=/var/lib/gtl-crm/wa-auth
CRON_SECRET=poner_un_token_largo
```

Tambien deben estar las variables de Supabase, NextAuth, Google Calendar y notificaciones que ya usa el proyecto.

## Build y arranque

En el VPS, dentro de `/var/www/gtl-crm`:

```bash
npm ci
npx prisma generate
npx prisma db push
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## Nginx

Crear un server block para pasar el subdominio al proceso Node:

```nginx
server {
  listen 80;
  server_name crm.globaltradelogisticsec.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Luego activar SSL:

```bash
sudo certbot --nginx -d crm.globaltradelogisticsec.com
```

## Cron de workflows

Aunque el CRM tiene runner interno, en produccion conviene reforzarlo con cron cada minuto:

```bash
* * * * * curl -fsS "https://crm.globaltradelogisticsec.com/api/scheduled-messages/run?token=CRON_SECRET" >/dev/null 2>&1
```

Reemplazar `CRON_SECRET` por el valor real del `.env`.

## WhatsApp

La sesion se guardara en:

```txt
/var/lib/gtl-crm/wa-auth
```

No borrar esa carpeta. Si se borra, WhatsApp pedira QR otra vez.

## Verificacion

```bash
pm2 status
pm2 logs gtl-crm
curl -I https://crm.globaltradelogisticsec.com/login
```

Despues abrir:

```txt
https://crm.globaltradelogisticsec.com/whatsapp
```

Si pide QR, escanear una sola vez.
