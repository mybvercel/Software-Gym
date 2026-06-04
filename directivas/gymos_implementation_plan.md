# DIRECTIVA: GYMOS — Plan de Implementación Completo
> **ID:** PLAN-GYMOS-001 | **Versión:** 1.0 | **Estado:** ACTIVO

## Stack Técnico
- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, Recharts, Zustand
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Hosting:** Vercel (deploy automático desde GitHub)
- **Pagos:** Mercado Pago (ARS)
- **Notif:** Twilio WhatsApp + Resend Email
- **Video:** YouTube (MVP) → Cloudflare Stream (V2)
- **Analytics:** PostHog | **Monitoring:** Sentry

## Tablas DB (Supabase)
gyms, profiles, member_goals, exercises, routine_templates, template_days, template_exercises, routines, routine_days, routine_exercises, progress_logs, body_measurements, attendance, payments, messages, notifications, subscriptions, audit_logs

## Campos clave member_goals
goal_type: lose_weight | gain_muscle | tone | endurance | flexibility | general_health
fitness_level: beginner | intermediate | advanced

## RLS (Row Level Security)
- Alumno solo ve sus propios datos
- Trainer ve todos los alumnos de su gym
- Políticas en profiles, routines, progress_logs, messages

## Roadmap
- **MVP (Semana 1-4):** Auth + Rutinas + Vista alumno + Progreso + Deploy
- **V2 (Mes 2):** Dashboard métricas, plantillas reutilizables, notif. push, alertas inactividad
- **V3 (Mes 3-4):** Pagos MP, check-in QR, exportación PDF

## Pricing
- Starter: $15.000 ARS/mes — hasta 50 alumnos, 2 profes
- Pro: $28.000 ARS/mes — hasta 200 alumnos, 8 profes
- Enterprise: A convenio

## Métricas objetivo (Mes 3)
- 10 gyms activos → $150.000 ARS MRR
- Churn < 8%/mes
- % alumnos que abren la app > 60%
- NPS dueños > 50

## Seguridad
- HTTPS + RLS + 2FA para owner/trainer
- Cumplimiento Ley 25.326 (AAIP)
- Audit logs 12 meses, backups automáticos Supabase Pro
- Rate limiting en middleware

## Variables de entorno necesarias
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
MP_ACCESS_TOKEN, MP_PUBLIC_KEY, MP_WEBHOOK_SECRET,
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM,
RESEND_API_KEY, NEXT_PUBLIC_POSTHOG_KEY, SENTRY_DSN

## Restricciones conocidas
- Supabase Auth + Next.js App Router: usar @supabase/ssr estrictamente
- DNI: índice UNIQUE(gym_id, dni) — no global
- Drag & drop rutinas: usar @dnd-kit/core, no react-beautiful-dnd
- MP: solo ARS, no almacenar datos de tarjeta
