# GymOS

Sistema digital de gestión para gimnasios (SaaS multi-tenant).
Panel de profesores + app para alumnos: rutinas, progreso, asistencia,
feedback y más.

## Stack
- **Next.js** (App Router) + TypeScript
- **Supabase** (PostgreSQL + Auth + RLS)
- **Tailwind / CSS variables** + lucide-react + Recharts

## Setup local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear `.env.local` a partir de `.env.example` y completar las claves de
   Supabase + `SESSION_SECRET` (generar con
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
3. En Supabase → SQL Editor, correr `supabase/migrations/001_initial_schema.sql`
   y luego `node supabase/seed/run_seed.mjs` para los ejercicios base.
4. Levantar el server:
   ```bash
   npm run dev
   ```

## Deploy en Vercel
1. Importar el repo en Vercel.
2. Cargar las variables de entorno (las mismas de `.env.example`).
3. Deploy. Vercel detecta Next.js automáticamente.

## Estructura
- `app/` — rutas (App Router) y API routes (`app/api/...`)
- `components/` — UI (auth, dashboard, ui, exercises)
- `lib/` — Supabase clients, sesión, validaciones, lógica de progreso
- `supabase/` — migraciones SQL y seed de ejercicios
