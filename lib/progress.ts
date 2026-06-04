/**
 * lib/progress.ts
 * Turns raw progress_logs into per-exercise weekly progression + a
 * deterministic "insight" (the programmed analysis the trainer/member see).
 */

export interface RawLog {
  exercise_id: string;
  exercise_name: string;
  weight_kg: number;
  logged_at: string; // ISO
}

export interface WeekPoint {
  week: number;      // 1-based week index from the first log
  label: string;     // "Sem 1"
  weight: number;    // max weight that week
  date: string;      // last date in that week (for reference)
}

export type Trend = "up" | "down" | "flat";

export interface ExerciseProgress {
  exercise_id: string;
  exercise_name: string;
  points: WeekPoint[];
  first: number;
  last: number;
  max: number;
  deltaKg: number;   // last - first
  deltaPct: number;  // % change first → last
  trend: Trend;
  weeks: number;     // number of weeks with data
  insight: string;   // human-readable conclusion
}

const DAY = 86400000;

/** Build per-exercise weekly progression from raw logs (already weight-filtered). */
export function buildExerciseProgress(logs: RawLog[]): ExerciseProgress[] {
  const byExercise = new Map<string, { name: string; logs: RawLog[] }>();
  for (const l of logs) {
    if (l.weight_kg == null) continue;
    if (!byExercise.has(l.exercise_id))
      byExercise.set(l.exercise_id, { name: l.exercise_name, logs: [] });
    byExercise.get(l.exercise_id)!.logs.push(l);
  }

  const result: ExerciseProgress[] = [];

  for (const [exId, { name, logs: exLogs }] of byExercise) {
    const sorted = [...exLogs].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
    const start = new Date(sorted[0].logged_at).getTime();

    // Bucket by week index relative to the first log; keep the max weight per week
    const weekMap = new Map<number, { weight: number; date: string }>();
    for (const l of sorted) {
      const wk = Math.floor((new Date(l.logged_at).getTime() - start) / (7 * DAY)) + 1;
      const cur = weekMap.get(wk);
      if (!cur || l.weight_kg > cur.weight) weekMap.set(wk, { weight: l.weight_kg, date: l.logged_at });
      else if (l.weight_kg === cur.weight) weekMap.set(wk, { weight: cur.weight, date: l.logged_at });
    }

    const points: WeekPoint[] = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, v]) => ({ week, label: `Sem ${week}`, weight: v.weight, date: v.date }));

    const first = points[0].weight;
    const last = points[points.length - 1].weight;
    const max = Math.max(...points.map(p => p.weight));
    const deltaKg = parseFloat((last - first).toFixed(1));
    const deltaPct = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
    const trend: Trend = deltaKg > 0 ? "up" : deltaKg < 0 ? "down" : "flat";
    const weeks = points.length;

    let insight: string;
    if (weeks < 2) {
      insight = `Primera carga registrada: ${first} kg. Seguí cargando para ver tu evolución.`;
    } else if (trend === "up") {
      insight = `Progresando: +${deltaKg} kg (${deltaPct > 0 ? "+" : ""}${deltaPct}%) en ${weeks} semanas. Máximo: ${max} kg.`;
    } else if (trend === "down") {
      insight = `Bajó ${Math.abs(deltaKg)} kg respecto al inicio. Máximo alcanzado: ${max} kg.`;
    } else {
      insight = `Estable en ${last} kg durante ${weeks} semanas. Es buen momento para subir la carga.`;
    }

    result.push({
      exercise_id: exId, exercise_name: name,
      points, first, last, max, deltaKg, deltaPct, trend, weeks, insight,
    });
  }

  // Most recently improved / most data first
  return result.sort((a, b) => b.points.length - a.points.length || b.max - a.max);
}

/** Overall one-line summary across all exercises (programmed conclusion). */
export function overallInsight(items: ExerciseProgress[]): string {
  if (items.length === 0) return "Todavía no hay datos de cargas. Registrá tus pesos para ver tu progreso.";
  const improving = items.filter(i => i.trend === "up").length;
  const total = items.length;
  if (improving === 0) return `Registraste ${total} ejercicio${total > 1 ? "s" : ""}. Aún sin progresión de carga clara.`;
  return `Estás progresando en ${improving} de ${total} ejercicios. ¡Seguí así!`;
}
