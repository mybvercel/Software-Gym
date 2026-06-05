/**
 * lib/datetime.ts
 * Todo el manejo de fechas/horarios usa la zona de Córdoba, Argentina.
 * Argentina es UTC-3 fijo (sin horario de verano), así que el offset es estable.
 */

export const AR_TZ = "America/Argentina/Cordoba";

/** Día de la semana ISO (1=Lun … 7=Dom) para un instante, en hora de Córdoba. */
export function arWeekday(d: Date = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: AR_TZ, weekday: "short" }).format(d);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[wd] ?? 1;
}

/** Fecha YYYY-MM-DD para un instante, en hora de Córdoba. */
export function arDateOnly(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d); // en-CA => "YYYY-MM-DD"
}

/** Inicio del día (medianoche Córdoba) como ISO UTC. UTC-3 fijo. */
export function arDayStartISO(d: Date = new Date()): string {
  return `${arDateOnly(d)}T03:00:00.000Z`;
}

/** Inicio del día de hace N días, en Córdoba, como ISO UTC. */
export function arDaysAgoStartISO(days: number): string {
  return arDayStartISO(new Date(Date.now() - days * 86400000));
}

/** Formatea una fecha para mostrar, en hora de Córdoba. */
export function arFormat(
  iso: string | Date,
  opts: Intl.DateTimeFormatOptions
): string {
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: AR_TZ, ...opts });
}
