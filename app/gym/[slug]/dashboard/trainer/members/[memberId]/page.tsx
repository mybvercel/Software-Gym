"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import {
  ArrowLeft, ClipboardList, Dumbbell, TrendingUp,
  CheckCircle, XCircle, Calendar, Scale, ChevronDown, ChevronUp,
} from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>("health");

  useEffect(() => { loadAll(); }, [memberId]);

  const loadAll = async () => {
    setIsLoading(true);
    const [
      { data: profileData },
      { data: healthData },
      { data: routineData },
      { data: measuresData },
      { data: logsData },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", memberId).single(),
      supabase.from("member_goals").select("*").eq("member_id", memberId).maybeSingle(),
      supabase.from("routines").select("id, name, is_active, starts_at, routine_days(id, name, day_number, routine_exercises(id, sets, reps, exercise:exercises(name)))").eq("member_id", memberId).eq("is_active", true).maybeSingle(),
      supabase.from("body_measurements").select("*").eq("member_id", memberId).order("measured_at", { ascending: false }).limit(5),
      supabase.from("progress_logs").select("*, exercise:exercises(name)").eq("member_id", memberId).order("logged_at", { ascending: false }).limit(20),
    ]);
    setMember(profileData);
    setHealth(healthData);
    setRoutine(routineData);
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
          <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: "13px", fontWeight: 500, fontFamily: T.font, padding: "0 0 20px", marginLeft: "-4px" }}>
            <ArrowLeft size={15} /> Volver
          </button>

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
              onClick={() => router.push(`/gym/${slug}/dashboard/trainer`)}
              style={{ flex: 1, height: "38px", borderRadius: "10px", border: "none", background: T.green, cursor: "pointer", fontFamily: T.font, fontWeight: 700, fontSize: "13px", color: "#fff" }}>
              Asignar rutina
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
            <p style={{ fontSize: "13px", color: T.muted, padding: "4px 0" }}>Sin rutina asignada.</p>
          ) : (
            <div>
              <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "15px", color: T.text, margin: "0 0 12px" }}>{routine.name}</p>
              {(routine.routine_days ?? []).sort((a: any, b: any) => a.day_number - b.day_number).map((day: any) => (
                <div key={day.id} style={{ marginBottom: "12px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>
                    {day.name ?? `Día ${day.day_number}`}
                  </p>
                  {(day.routine_exercises ?? []).map((re: any, i: number) => (
                    <div key={re.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", marginBottom: "4px", background: T.bg, borderRadius: "8px" }}>
                      <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: "12px", color: T.green, width: "18px" }}>{i + 1}</span>
                      <p style={{ flex: 1, fontSize: "13px", color: T.text, fontWeight: 600, margin: 0 }}>{re.exercise?.name}</p>
                      <span style={{ fontSize: "12px", color: T.muted }}>{re.sets}×{re.reps}</span>
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
      </div>
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
