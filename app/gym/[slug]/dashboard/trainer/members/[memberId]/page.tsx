"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import RoutineBuilder from "@/components/dashboard/RoutineBuilder";
import BackButton from "@/components/ui/BackButton";
import { buildExerciseProgress, overallInsight, type ExerciseProgress } from "@/lib/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  ClipboardList, Dumbbell, TrendingUp,
  CheckCircle, Clock, Calendar, Scale, ChevronDown, ChevronUp,
  Plus, Pencil, X, MessageSquare, ArrowUp, ArrowDown, Minus,
} from "lucide-react";

const WEEKDAY_NAMES: Record<number, string> = {
  1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo",
};

/* ─────── Design tokens (same as TrainerDashboard) ── */
const T = {
  navy: "#0D1B2A", green: "#22C55E", greenDim: "rgba(34,197,94,0.10)",
  greenBorder: "rgba(34,197,94,0.28)", white: "#FFFFFF", bg: "#F1F5F9",
  card: "#FFFFFF", border: "#E2E8F0", text: "#0F172A",
  muted: "#64748B", light: "#94A3B8",
  red: "#EF4444", redDim: "rgba(239,68,68,0.10)",
  orange: "#F97316", orangeDim: "rgba(249,115,22,0.10)",
  font: "'Space Grotesk', system-ui, sans-serif",
};

const AVATAR_COLORS = ["#3B82F6","#8B5CF6","#EC4899","#F59E0B","#10B981","#EF4444","#06B6D4","#84CC16"];
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const GOAL_LABELS: Record<string,string> = { lose_weight:"Bajar de peso", gain_muscle:"Ganar músculo", tone:"Tonificar", endurance:"Resistencia", general_health:"Salud general" };
const LEVEL_LABELS: Record<string,string> = { beginner:"Principiante", intermediate:"Intermedio", advanced:"Avanzado" };

/* ─────── Component ── */

export default function MemberDetailPage() {
  const supabase   = createClient();
  const router     = useRouter();
  const params     = useParams<{ slug: string; memberId: string }>();
  const { slug, memberId } = params;

  const [member,    setMember]    = useState<any>(null);
  const [health,    setHealth]    = useState<any>(null);
  const [routine,   setRoutine]   = useState<any>(null);
  const [measures,  setMeasures]  = useState<any[]>([]);
  const [logs,      setLogs]      = useState<any[]>([]);
  const [feedback,  setFeedback]  = useState<any[]>([]);
  const [exProgress, setExProgress] = useState<ExerciseProgress[]>([]);
  const [openEx,    setOpenEx]    = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>("health");
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => { loadAll(); }, [memberId]);

  const loadAll = async () => {
    setIsLoading(true);
    const [
      { data: profileData },
      { data: healthData },
      { data: routineData },
      { data: measuresData },
      { data: logsData },
      { data: feedbackData },
      { data: progressData },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", memberId).single(),
      supabase.from("member_goals").select("*").eq("member_id", memberId).maybeSingle(),
      supabase.from("routines").select("id, name, is_active, starts_at, routine_days(id, name, day_number, routine_exercises(id, sets, reps, rest_seconds, notes, exercise:exercises(name)))").eq("member_id", memberId).eq("is_active", true).maybeSingle(),
      supabase.from("body_measurements").select("*").eq("member_id", memberId).order("measured_at", { ascending: false }).limit(5),
      supabase.from("progress_logs").select("*, exercise:exercises(name)").eq("member_id", memberId).order("logged_at", { ascending: false }).limit(20),
      supabase.from("notifications").select("body, metadata, created_at").eq("type", "session_feedback").filter("metadata->>member_id", "eq", memberId).order("created_at", { ascending: false }).limit(20),
      supabase.from("progress_logs").select("exercise_id, weight_kg, logged_at, exercise:exercises(name)").eq("member_id", memberId).not("weight_kg", "is", null).order("logged_at", { ascending: true }),
    ]);
    setMember(profileData);
    setHealth(healthData);
    setRoutine(routineData);
    setFeedback(feedbackData ?? []);

    // Per-exercise weekly progression (same engine the member sees)
    const rawLogs = ((progressData ?? []) as any[]).map(l => ({
      exercise_id: l.exercise_id,
      exercise_name: (l.exercise as any)?.name ?? l.exercise_id,
      weight_kg: l.weight_kg,
      logged_at: l.logged_at,
    }));
    setExProgress(buildExerciseProgress(rawLogs));
    setMeasures(measuresData ?? []);
    setLogs(logsData ?? []);
    setIsLoading(false);
  };

  const toggleActive = async () => {
    if (!member) return;
    await supabase.from("profiles").update({ is_active: !member.is_active }).eq("id", memberId);
    setMember((p: any) => ({ ...p, is_active: !p.is_active }));
  };

  if (isLoading || !member) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="gymos-spinner-lg" />
    </div>
  );

  const latest = measures[0];
  const bgColor = avatarColor(member.full_name);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>

      {/* ── Header ── */}
      <div style={{ background: T.navy, padding: "48px 20px 28px" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div style={{ marginBottom: "20px" }}>
            <BackButton onClick={() => router.back()} tone="dark" />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: bgColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font, fontWeight: 800, fontSize: "20px", color: "#fff", flexShrink: 0 }}>
              {getInitials(member.full_name)}
            </div>
            <div>
              <h1 style={{ fontFamily: T.font, fontWeight: 800, fontSize: "20px", color: "#fff", margin: "0 0 3px", letterSpacing: "-0.01em" }}>
                {member.full_name}
              </h1>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                DNI {member.dni ?? "—"} · {member.is_active ? "Activo" : "Inactivo"}
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
            <button
              onClick={toggleActive}
              style={{ flex: 1, height: "38px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", cursor: "pointer", fontFamily: T.font, fontWeight: 600, fontSize: "13px", color: member.is_active ? T.red : T.green }}>
              {member.is_active ? "Desactivar" : "Activar"}
            </button>
            <button
              onClick={() => setShowBuilder(true)}
              style={{ flex: 1, height: "38px", borderRadius: "10px", border: "none", background: T.green, cursor: "pointer", fontFamily: T.font, fontWeight: 700, fontSize: "13px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              {routine ? <><Pencil size={14} /> Editar rutina</> : <><Plus size={14} /> Crear rutina</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "20px 16px 48px", display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* CUESTIONARIO DE SALUD */}
        <Accordion
          id="health"
          open={openSection === "health"}
          onToggle={() => setOpenSection(openSection === "health" ? null : "health")}
          icon={<ClipboardList size={16} color={T.green} />}
          title="Cuestionario de salud"
        >
          {!health ? (
            <p style={{ fontSize: "13px", color: T.muted, padding: "4px 0" }}>El alumno aún no completó el cuestionario.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <HealthRow label="Objetivo"        value={GOAL_LABELS[health.goal] ?? health.goal} />
              <HealthRow label="Nivel"           value={LEVEL_LABELS[health.experience_level] ?? health.experience_level} />
              <HealthRow label="Días por semana" value={health.days_per_week ? `${health.days_per_week} días` : undefined} />
              {health.injuries && <HealthRow label="Lesiones / limitaciones" value={health.injuries} multi />}
              <HealthRow label="Suplementos" value={health.uses_supplements ? (health.supplements_detail || "Sí") : "No"} />
              {health.objectives_detail && <HealthRow label="Objetivos" value={health.objectives_detail} multi />}
            </div>
          )}
        </Accordion>

        {/* RUTINA ACTIVA */}
        <Accordion
          id="routine"
          open={openSection === "routine"}
          onToggle={() => setOpenSection(openSection === "routine" ? null : "routine")}
          icon={<Dumbbell size={16} color={T.green} />}
          title="Rutina activa"
        >
          {!routine ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <p style={{ fontSize: "13px", color: T.muted, margin: "0 0 12px" }}>Este alumno todavía no tiene rutina asignada.</p>
              <button onClick={() => setShowBuilder(true)} style={{ height: "40px", padding: "0 20px", borderRadius: "10px", background: T.green, border: "none", cursor: "pointer", color: "#fff", fontFamily: T.font, fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Plus size={15} /> Crear rutina
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "15px", color: T.text, margin: 0 }}>{routine.name}</p>
                <button onClick={() => setShowBuilder(true)} style={{ display: "flex", alignItems: "center", gap: "5px", background: T.greenDim, border: `1px solid ${T.greenBorder}`, borderRadius: "8px", padding: "5px 10px", cursor: "pointer", color: T.green, fontSize: "12px", fontWeight: 700, fontFamily: T.font }}>
                  <Pencil size={12} /> Editar
                </button>
              </div>
              {/* Weekday summary */}
              <div style={{ display: "flex", gap: "5px", marginBottom: "14px", flexWrap: "wrap" }}>
                {[1,2,3,4,5,6,7].map(wd => {
                  const trains = (routine.routine_days ?? []).some((d: any) => d.day_number === wd);
                  return (
                    <span key={wd} style={{ width: "34px", height: "30px", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, fontFamily: T.font,
                      background: trains ? T.greenDim : T.bg, color: trains ? T.green : T.light,
                      border: `1px solid ${trains ? T.greenBorder : T.border}` }}>
                      {["L","M","M","J","V","S","D"][wd-1]}
                    </span>
                  );
                })}
              </div>
              {(routine.routine_days ?? []).sort((a: any, b: any) => a.day_number - b.day_number).map((day: any) => (
                <div key={day.id} style={{ marginBottom: "14px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>
                    {WEEKDAY_NAMES[day.day_number] ?? `Día ${day.day_number}`} — {day.name}
                  </p>
                  {(day.routine_exercises ?? []).map((re: any, i: number) => (
                    <div key={re.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", marginBottom: "4px", background: T.bg, borderRadius: "8px" }}>
                      <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: "12px", color: T.green, width: "18px" }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "13px", color: T.text, fontWeight: 600, margin: 0 }}>{re.exercise?.name}</p>
                        {re.notes && <p style={{ fontSize: "11px", color: T.muted, margin: "2px 0 0" }}>{re.notes}</p>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "13px", color: T.text, fontWeight: 700, fontFamily: T.font }}>{re.sets}×{re.reps}</span>
                        <p style={{ fontSize: "10px", color: T.muted, margin: 0 }}>{re.rest_seconds}s desc.</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Accordion>

        {/* MEDIDAS CORPORALES */}
        <Accordion
          id="measures"
          open={openSection === "measures"}
          onToggle={() => setOpenSection(openSection === "measures" ? null : "measures")}
          icon={<Scale size={16} color={T.green} />}
          title="Medidas corporales"
        >
          {!latest ? (
            <p style={{ fontSize: "13px", color: T.muted, padding: "4px 0" }}>Sin mediciones registradas.</p>
          ) : (
            <div>
              <p style={{ fontSize: "11px", color: T.muted, margin: "0 0 12px" }}>
                Última medición: {new Date(latest.measured_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { k: "weight_kg", l: "Peso", u: "kg" }, { k: "body_fat_pct", l: "% Grasa", u: "%" },
                  { k: "muscle_mass_kg", l: "Músculo", u: "kg" }, { k: "waist_cm", l: "Cintura", u: "cm" },
                  { k: "chest_cm", l: "Pecho", u: "cm" }, { k: "arm_cm", l: "Brazo", u: "cm" },
                ].filter(f => latest[f.k] != null).map(f => (
                  <div key={f.k} style={{ background: T.bg, borderRadius: "10px", padding: "10px 12px" }}>
                    <p style={{ fontSize: "11px", color: T.muted, margin: "0 0 3px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.l}</p>
                    <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: "18px", color: T.text, margin: 0 }}>
                      {latest[f.k]}<span style={{ fontSize: "12px", fontWeight: 500, color: T.muted, marginLeft: "3px" }}>{f.u}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Accordion>

        {/* HISTORIAL */}
        <Accordion
          id="logs"
          open={openSection === "logs"}
          onToggle={() => setOpenSection(openSection === "logs" ? null : "logs")}
          icon={<TrendingUp size={16} color={T.green} />}
          title="Historial de entrenamientos"
        >
          {logs.length === 0 ? (
            <p style={{ fontSize: "13px", color: T.muted, padding: "4px 0" }}>Sin sesiones registradas.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {logs.slice(0, 10).map((log, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: T.bg, borderRadius: "10px" }}>
                  <CheckCircle size={14} color={T.green} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: T.font, fontWeight: 600, fontSize: "13px", color: T.text, margin: 0 }}>
                      {(log.exercise as any)?.name ?? "Ejercicio"}
                    </p>
                    <p style={{ fontSize: "11px", color: T.muted, margin: "2px 0 0" }}>
                      {new Date(log.logged_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  {log.weight_kg && (
                    <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: "13px", color: T.green }}>
                      {log.weight_kg}kg
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Accordion>

        {/* FEEDBACK / CÓMO SE SINTIÓ */}
        <Accordion
          id="feedback"
          open={openSection === "feedback"}
          onToggle={() => setOpenSection(openSection === "feedback" ? null : "feedback")}
          icon={<MessageSquare size={16} color={T.green} />}
          title="Cómo se sintió en las sesiones"
        >
          {feedback.length === 0 ? (
            <p style={{ fontSize: "13px", color: T.muted, padding: "4px 0" }}>El alumno todavía no dejó comentarios de sus sesiones.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {feedback.map((f, i) => {
                const md = f.metadata ?? {};
                return (
                  <div key={i} style={{ background: T.bg, borderRadius: "12px", padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: md.comment ? "8px" : 0, flexWrap: "wrap", gap: "6px" }}>
                      <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: "13px", color: T.text }}>
                        {new Date(f.created_at).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                        {md.day_name ? ` · ${md.day_name}` : ""}
                      </span>
                      {md.mood_label && (
                        <span style={{ fontSize: "12px", fontWeight: 700, color: T.green, background: T.greenDim, border: `1px solid ${T.greenBorder}`, borderRadius: "999px", padding: "3px 10px" }}>
                          {md.mood_label}
                        </span>
                      )}
                    </div>
                    {md.comment && (
                      <p style={{ fontSize: "14px", color: T.text, margin: "0 0 6px", lineHeight: 1.5, fontStyle: "italic" }}>
                        “{md.comment}”
                      </p>
                    )}
                    <p style={{ fontSize: "11px", color: T.muted, margin: 0 }}>
                      {md.exercises_done != null ? `${md.exercises_done} ejercicios` : ""}
                      {md.total_volume_kg != null ? ` · ${md.total_volume_kg}kg volumen` : ""}
                      {md.duration_min != null ? ` · ${md.duration_min} min` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Accordion>

        {/* PROGRESO POR EJERCICIO */}
        <Accordion
          id="exprogress"
          open={openSection === "exprogress"}
          onToggle={() => setOpenSection(openSection === "exprogress" ? null : "exprogress")}
          icon={<TrendingUp size={16} color={T.green} />}
          title="Progreso por ejercicio"
        >
          {exProgress.length === 0 ? (
            <p style={{ fontSize: "13px", color: T.muted, padding: "4px 0" }}>Todavía no hay cargas registradas.</p>
          ) : (
            <div>
              <div style={{ background: T.greenDim, border: `1px solid ${T.greenBorder}`, borderRadius: "10px", padding: "10px 12px", marginBottom: "12px" }}>
                <p style={{ fontSize: "13px", color: T.text, fontWeight: 600, margin: 0 }}>{overallInsight(exProgress)}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {exProgress.map(ex => {
                  const isOpen = openEx === ex.exercise_id;
                  const tc = ex.trend === "up" ? T.green : ex.trend === "down" ? T.red : T.muted;
                  return (
                    <div key={ex.exercise_id} style={{ background: T.bg, borderRadius: "12px", overflow: "hidden" }}>
                      <button onClick={() => setOpenEx(isOpen ? null : ex.exercise_id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "14px", color: T.text, margin: 0 }}>{ex.exercise_name}</p>
                          <p style={{ fontSize: "12px", color: T.muted, margin: "2px 0 0" }}>{ex.first} → {ex.last} kg · {ex.weeks} sem · máx {ex.max}kg</p>
                        </div>
                        {ex.weeks >= 2 && (
                          <span style={{ display: "flex", alignItems: "center", gap: "3px", color: tc, fontFamily: T.font, fontWeight: 800, fontSize: "14px" }}>
                            {ex.trend === "up" ? <ArrowUp size={13} /> : ex.trend === "down" ? <ArrowDown size={13} /> : <Minus size={13} />}
                            {ex.deltaKg > 0 ? "+" : ""}{ex.deltaKg}
                          </span>
                        )}
                        {isOpen ? <ChevronUp size={15} color={T.light} /> : <ChevronDown size={15} color={T.light} />}
                      </button>
                      {isOpen && (
                        <div style={{ padding: "0 14px 14px" }}>
                          <p style={{ fontSize: "13px", color: T.muted, margin: "0 0 12px", lineHeight: 1.5 }}>{ex.insight}</p>
                          {ex.points.length >= 2 && (
                            <ResponsiveContainer width="100%" height={150}>
                              <LineChart data={ex.points} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                                <XAxis dataKey="label" tick={{ fill: T.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fill: T.muted, fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                                <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: "10px", fontSize: "12px", color: T.text }} formatter={(v) => [`${v} kg`, "Peso"]} />
                                <Line type="monotone" dataKey="weight" stroke={T.green} strokeWidth={2.5} dot={{ fill: T.green, r: 4 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Accordion>
      </div>

      {/* ── ROUTINE BUILDER OVERLAY ── */}
      {showBuilder && member && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "720px", height: "92vh", background: "var(--bg-card)", borderRadius: "24px 24px 0 0", border: "1px solid var(--border-subtle)", padding: "20px", display: "flex", flexDirection: "column" }}>
            <RoutineBuilder
              gymSlug={slug}
              preselectedMember={member}
              onClose={() => setShowBuilder(false)}
              onSaved={() => loadAll()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared sub-components ── */

function Accordion({ id, open, onToggle, icon, title, children }: {
  id: string; open: boolean; onToggle: () => void;
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "14px", overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: T.greenDim, border: `1px solid ${T.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ flex: 1, fontFamily: T.font, fontWeight: 700, fontSize: "14px", color: T.text }}>{title}</span>
        {open ? <ChevronUp size={16} color={T.light} /> : <ChevronDown size={16} color={T.light} />}
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${T.border}`, paddingTop: "14px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function HealthRow({ label, value, multi }: { label: string; value?: string; multi?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ background: T.bg, borderRadius: "10px", padding: "10px 12px" }}>
      <p style={{ fontSize: "11px", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontSize: "13px", color: T.text, fontWeight: 500, margin: 0, lineHeight: multi ? 1.6 : 1.3 }}>{value}</p>
    </div>
  );
}
