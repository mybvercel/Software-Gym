# GymOS — Roadmap de funciones

Decisiones tomadas con el cliente. Dividido en lo que se construye AHORA y lo
que queda documentado para activar MÁS ADELANTE (cuando el cliente lo pida).

---

## ✅ AHORA (en construcción)

### 1. Alertas de inactividad + "Acciones del día" (panel del profe)
- Sección en el panel del profe que cada día le muestra a quién contactar:
  - **Cumpleaños** del día / de la semana.
  - **Alumnos inactivos** (7+, 14+, 30+ días sin entrenar) — riesgo de baja.
  - **Cuotas por vencer / vencidas**.
- Cada item trae un **mensaje profesional sugerido** para copiar y enviar
  (sin "te extrañamos" cursi; tono cercano pero profesional).
- Todo con datos que ya existen (asistencia, `birth_date`, `payments`).

### 2. Reseñas por ejercicio visibles para el profe
- Surfacing del `notes` + `perceived_effort` (RPE) que el alumno carga por
  ejercicio en el historial del panel del profe (cómo se sintió en cada uno).

### 3. Dashboard de negocio (dueño)
- Métricas: total de alumnos, activos, **altas del mes**, inactivos/bajas,
  **tasa de retención**, asistencias del mes, cuotas al día vs vencidas,
  **ingresos del mes**. Se suma al tab de Stats.

### 4. Exportar rutina a PDF
- Botón que genera un PDF prolijo de la rutina del alumno (días, ejercicios,
  series × reps × descanso, notas del profe) para imprimir o compartir.

---

## 🔜 FUTURO (documentado, se activa cuando el cliente lo pida)

### F1. WhatsApp automático (recordatorios de cuota y más)
**Objetivo:** avisos automáticos por WhatsApp (cuota por vencer/vencida,
recordatorio de inactividad, cumpleaños).
**Stack:** Twilio WhatsApp Business API (mejor doc/SDK en LATAM).
**Plan de implementación:**
1. Crear cuenta Twilio + número de WhatsApp Business; cargar
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` en env.
2. Pre-aprobar **templates** con Meta (obligatorio para mensajes iniciados):
   - `cuota_por_vencer`: "Hola {{1}}, tu cuota vence el {{2}}. Podés pagarla
     desde la app."
   - `inactividad`: "Hola {{1}}, hace {{2}} días que no venís. Tu rutina te
     espera, ¿coordinamos?"
   - `cumpleanos`: "¡Feliz cumple {{1}}! 🎉 De parte de todo el equipo."
3. API route `/api/whatsapp/send` (service role) que recibe template + vars +
   teléfono y llama a Twilio.
4. **Disparadores** (sin cron externo, igual que close-stale-workouts):
   barrido diario lazy que detecta cuotas por vencer / inactivos / cumpleaños
   y manda el template. Guardar en `notifications` qué se envió para no
   duplicar (1 por día por evento).
5. Webhook `/api/whatsapp/webhook` para recibir respuestas y el "STOP"
   (baja de notificaciones → `profiles.whatsapp_notifications = false`).
6. Consentimiento: checkbox en el alta ("Acepto recibir mensajes de WhatsApp")
   por Ley 25.326.
**Costo:** ~USD 0.005 por mensaje (irrelevante a baja escala).

### F2. Reserva de clases grupales (super series, banco, etc.)
**Objetivo:** que los alumnos se anoten a turnos/clases con cupo. Los que hacen
clases grupales cancelan 56% menos.
**Schema nuevo (SQL):**
```sql
CREATE TABLE class_types (
  id UUID PK, gym_id UUID, name TEXT, description TEXT,
  capacity INT DEFAULT 12, duration_min INT DEFAULT 60, color TEXT
);
CREATE TABLE class_sessions (
  id UUID PK, gym_id UUID, class_type_id UUID, trainer_id UUID,
  starts_at TIMESTAMPTZ, capacity INT, is_cancelled BOOL DEFAULT false
);
CREATE TABLE class_bookings (
  id UUID PK, session_id UUID, member_id UUID,
  status TEXT CHECK (status IN ('booked','waitlist','cancelled','attended')),
  created_at TIMESTAMPTZ, UNIQUE(session_id, member_id)
);
```
**Plan:**
1. Migración con las 3 tablas + RLS.
2. Panel del profe: crear tipos de clase + agenda semanal de sesiones
   (día/hora/cupo/profe). Detección de conflicto de horario del profe.
3. App del alumno: ver clases de la semana, **reservar** (si hay cupo) o
   entrar a **lista de espera**; al cancelar alguien, se promueve el primero
   de la lista automáticamente.
4. Reglas: límite de reservas, ventana de cancelación, marcar asistencia.
5. La asistencia a clase también alimenta las stats y el "entrenaron hoy".

### F3. Notificaciones in-app (campana) + recordatorio de cambio de rutina
**Objetivo:** avisos dentro de la app sin depender de terceros. Incluye el
caso "pasaron 2 meses, cambiá los ejercicios" que configura el profe.
**Plan:**
1. Usar la tabla `notifications` que ya existe (type, title, body, is_read,
   metadata). Agregar índice por `user_id, is_read`.
2. Ícono de campana con badge de no leídas en el header del alumno y del profe;
   panel desplegable con la lista; marcar como leídas.
3. Eventos que generan notificación:
   - "Tu profe te asignó una rutina nueva" (al guardar rutina).
   - "Tu cuota vence en X días".
   - Para el profe: **"La rutina de {alumno} tiene {N} semanas — conviene
     actualizarla"** (barrido lazy que mira `routines.starts_at`; umbral
     configurable por el profe, default 8 semanas).
4. (Opcional) Web Push para que llegue con la app cerrada (service worker +
   VAPID keys).

### F4. Facturación AFIP (comprobante digital)
**Objetivo:** emitir comprobantes válidos para gimnasios formales.
**Plan:**
1. Integrar con AFIP WSFE (Web Service de Facturación Electrónica) vía un SDK
   (ej. `afip.ts`) con certificado + clave fiscal del gym.
2. Al aprobar un pago, generar el comprobante (Factura C o B según condición),
   guardar CAE + número.
3. PDF del comprobante descargable por el alumno y el profe.
4. Es la función más compleja (certificados, ambiente homologación → producción).

### F5. Gamificación (simple y profesional)
**Objetivo:** enganchar sin que se vea infantil (el público mayor quiere algo
serio). NO ahora — futuro.
**Plan (versión sobria):**
1. **Rachas** de asistencia ("4 semanas seguidas").
2. **Récords personales** destacados cuando se supera una marca (ya tenemos
   el dato de progreso por ejercicio).
3. **Hitos** discretos ("100 entrenamientos completados").
4. Sin medallas chillonas ni puntos arcade — tarjetas limpias y datos reales.

### F6. Check-in con QR (si se quiere asistencia en la puerta)
**Plan:** QR por gym en recepción; el alumno escanea desde la app y registra
asistencia (`method = 'qr'`). Útil si quieren control de acceso real además
del "empezar entrenamiento".

---

## Notas de prioridad (futuro)
Orden sugerido cuando se retomen: **F1 (WhatsApp) → F3 (notificaciones) →
F2 (clases) → F6 (QR) → F4 (AFIP) → F5 (gamificación)**.
