# GTL Rate Manager

Sistema interno de gestión de tarifas marítimas/aéreas para **Global Trade Logistics S.A.S.** (Ecuador).

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalación

1. Clonar el repositorio e instalar dependencias:

```bash
npm install
```

2. Copiar el archivo de variables de entorno:

```bash
cp .env.example .env
```

3. Editar `.env` con sus credenciales de base de datos y generar el secreto:

```bash
openssl rand -base64 32
```

4. Generar el cliente Prisma y ejecutar migraciones:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. Poblar la base de datos con datos de demostración:

```bash
npm run db:seed
```

6. Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Credenciales de acceso (demo)

- **Email:** admin@gtllogistics.com
- **Contraseña:** GTL2026admin!

## Estructura del proyecto

- `src/app/` — Páginas y rutas (Next.js App Router)
- `src/components/` — Componentes reutilizables
- `src/lib/` — Utilidades, configuración de auth y Prisma
- `prisma/` — Schema de base de datos
