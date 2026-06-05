"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Check, Calendar as CalIcon } from "lucide-react";
import { arDateOnly } from "@/lib/datetime";

/* ── Muscle-group color palette (matched loosely by name) ── */
const MUSCLE_COLORS: { key: string; color: string }[] = [
  { key: "pierna", color: "#10B981" }, { key: "pecho", color: "#EF4444" },
  { key: "espalda", color: "#3B82F6" }, { key: "hombro", color: "#8B5CF6" },
  { key: "brazo", color: "#EC4899" }, { key: "biceps", color: "#EC4899" },
  { key: "triceps", color: "#EC4899" }, { key: "gluteo", color: "#F59E0B" },
  { key: "glúteo", color: "#F59E0B" }, { key: "core", color: "#F97316" },
  { key: "abdom", color: "#F97316" }, { key: "cardio", color: "#06B6D4" },
  { key: "full", color: "#84CC16" }, { key: "tren", color: "#84CC16" },
];

function muscleColor(name: string): string {
  const n = (name || "").toLowerCase();
  const hit = MUSCLE_COLORS.find(m => n.includes(m.key));
  return hit?.color ?? "#9EFF00";
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WEEKDAY_LABELS = ["L","M","M","J","V","S","D"];

function isoWeekday(d: Date): number {
  const g = d.getDay();         // 0=Sun…6=Sat
  return g === 0 ? 7 : g;       // 1=Mon…7=Sun
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

interface RoutineDay { day_number: number; name: string }

export default function WorkoutCalendar({ memberId }: { memberId: string }) {
  const supabase = createClient();
  const [routineDays, setRoutineDays] = useState<RoutineDay[]>([]);
  const [routineName, setRoutineName] = useState<string>("");
  const [attended, setAttended] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, [memberId]);

  const loadData = async () => {
    setIsLoading(true);
    const [{ data: routine }, { data: att }, { data: logs }] = await Promise.all([
      supabase.from("routines").select("name, routine_days(day_number, name)").eq("member_id", memberId).eq("is_active", true).maybeSingle(),
      supabase.from("attendance").select("checked_in_at").eq("member_id", memberId),
      supabase.from("progress_logs").select("logged_at").eq("member_id", memberId),
    ]);
    if (routine) {
      setRoutineName(routine.name);
      setRoutineDays((routine.routine_days ?? []) as RoutineDay[]);
    }
    const days = new Set<string>();
    // Map each timestamp to its Córdoba calendar day
    (att ?? []).forEach((a: { checked_in_at: string }) => days.add(arDateOnly(new Date(a.checked_in_at))));
    (logs ?? []).forEach((l: { logged_at: string }) => days.add(arDateOnly(new Date(l.logged_at))));
    setAttended(days);
    setIsLoading(false);
  };

  /* Build the grid (weeks starting Monday) */
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = isoWeekday(firstOfMonth) - 1;          // days before the 1st
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayByWeekday = new Map(routineDays.map(d => [d.day_number, d]));

  // unique muscles for the legend
  const legend = Array.from(new Map(routineDays.map(d => [d.name, muscleColor(d.name)])).entries());

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "20px 18px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CalIcon size={18} color="var(--lime)" />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px", color: "var(--text-primary)" }}>
            {MONTHS[month]} {year}
          </span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={navBtn}><ChevronLeft size={20} /></button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={navBtn}><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px", marginBottom: "6px" }}>
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", padding: "4px 0" }}>{w}</div>
        ))}
      </div>

      {/* Day grid */}
      {isLoading ? (
        <div style={{ height: "240px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="gymos-spinner" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px" }}>
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === month;
            const wd = isoWeekday(d);
            const training = dayByWeekday.get(wd);
            const didAttend = attended.has(ymd(d));
            const isToday = sameDay(d, today);
            const isPast = d < today;
            const color = training ? muscleColor(training.name) : null;

            // status
            let bg = "transparent", txt = inMonth ? "var(--text-secondary)" : "var(--text-muted)", border = "1.5px solid transparent", dot = false, check = false;
            if (didAttend) { bg = "var(--lime)"; txt = "#000"; check = true; }
            else if (training && !isPast) { border = `1.5px solid ${color}`; txt = "var(--text-primary)"; dot = true; }
            else if (training && isPast) { border = "1.5px solid rgba(255,71,87,0.35)"; txt = "var(--text-muted)"; dot = true; }

            return (
              <div key={i} style={{
                aspectRatio: "1", borderRadius: "10px",
                background: bg, border: isToday && !didAttend ? "2px solid var(--lime)" : border,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: "1px", opacity: inMonth ? 1 : 0.35, position: "relative",
              }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: txt, lineHeight: 1 }}>
                  {d.getDate()}
                </span>
                {check && <Check size={11} color="#000" strokeWidth={3} />}
                {dot && !check && (
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: color! }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)" }}>
        {routineName ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", marginBottom: "12px" }}>
              {legend.map(([name, color]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: color }} />
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>{name}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
              <LegendItem swatch={<div style={{ width: "16px", height: "16px", borderRadius: "5px", background: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={10} color="#000" strokeWidth={3} /></div>} label="Asististe" />
              <LegendItem swatch={<div style={{ width: "16px", height: "16px", borderRadius: "5px", border: "1.5px solid var(--lime)" }} />} label="Próximo entreno" />
              <LegendItem swatch={<div style={{ width: "16px", height: "16px", borderRadius: "5px", border: "1.5px solid rgba(255,71,87,0.4)" }} />} label="No asististe" />
            </div>
          </>
        ) : (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
            Cuando tu profesor te asigne una rutina, vas a ver acá tus días de entrenamiento.
          </p>
        )}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: "38px", height: "38px", borderRadius: "10px",
  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
  cursor: "pointer", color: "var(--text-primary)",
  display: "flex", alignItems: "center", justifyContent: "center",
};

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {swatch}
      <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
    </div>
  );
}
