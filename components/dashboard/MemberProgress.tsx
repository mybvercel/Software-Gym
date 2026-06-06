"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ArrowUp, ArrowDown, Minus,
  Plus, X, Loader2, TrendingUp,
  Scale, Activity,
} from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import WorkoutCalendar from "./WorkoutCalendar";
import GymLoader from "@/components/ui/GymLoader";
import { buildExerciseProgress, overallInsight, type ExerciseProgress } from "@/lib/progress";

/* ─────────────────────────────────────── Types ── */

interface MemberSession { id: string; name: string; gym_slug: string; }

interface Measurement {
  id: string;
  measured_at: string;
  weight_kg?: number;
  body_fat_pct?: number;
  muscle_mass_kg?: number;
  waist_cm?: number;
  chest_cm?: number;
  hip_cm?: number;
  arm_cm?: number;
  thigh_cm?: number;
}

interface PR {
  exercise_id: string;
  exercise_name: string;
  max_weight: number;
  achieved_at: string;
  history: { date: string; weight: number }[];
}

type MetricKey = "weight_kg" | "body_fat_pct" | "waist_cm" | "muscle_mass_kg";
type Period = "1m" | "3m" | "6m" | "all";

/* ────────────────────────────── Metric config ── */

const METRICS: { key: MetricKey; label: string; unit: string; icon: React.ReactNode }[] = [
  { key: "weight_kg",      label: "Peso",           unit: "kg",  icon: <Scale size={14} /> },
  { key: "body_fat_pct",   label: "% Grasa",         unit: "%",   icon: <Activity size={14} /> },
  { key: "waist_cm",       label: "Cintura",         unit: "cm",  icon: <TrendingUp size={14} /> },
  { key: "muscle_mass_kg", label: "Músculo",         unit: "kg",  icon: <TrendingUp size={14} /> },
];

const MEASUREMENT_FIELDS = [
  { key: "weight_kg",      label: "Peso",           unit: "kg",  step: "0.1",  min: "20",  max: "300" },
  { key: "body_fat_pct",   label: "% Grasa corporal",unit: "%",  step: "0.1",  min: "1",   max: "60"  },
  { key: "muscle_mass_kg", label: "Masa muscular",   unit: "kg",  step: "0.1",  min: "10",  max: "150" },
  { key: "waist_cm",       label: "Cintura",         unit: "cm",  step: "0.5",  min: "40",  max: "200" },
  { key: "chest_cm",       label: "Pecho",           unit: "cm",  step: "0.5",  min: "50",  max: "200" },
  { key: "hip_cm",         label: "Cadera",          unit: "cm",  step: "0.5",  min: "50",  max: "200" },
  { key: "arm_cm",         label: "Brazo",           unit: "cm",  step: "0.5",  min: "15",  max: "80"  },
  { key: "thigh_cm",       label: "Muslo",           unit: "cm",  step: "0.5",  min: "20",  max: "120" },
];

/* ──────────────────────────── Helpers ── */

function delta(curr?: number, prev?: number) {
  if (curr == null || prev == null) return null;
  return parseFloat((curr - prev).toFixed(1));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function periodCutoff(p: Period): Date | null {
  if (p === "all") return null;
  const d = new Date();
  if (p === "1m") d.setMonth(d.getMonth() - 1);
  if (p === "3m") d.setMonth(d.getMonth() - 3);
  if (p === "6m") d.setMonth(d.getMonth() - 6);
  return d;
}

/* ──────────────────────────── Component ── */

export default function MemberProgress({ gymSlug, embedded = false }: { gymSlug: string; embedded?: boolean }) {
  const supabase = createClient();
  const router   = useRouter();

  const [session,      setSession]      = useState<MemberSession | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [expandedPR,   setExpandedPR]   = useState<string | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);

  // chart state
  const [metric, setMetric] = useState<MetricKey>("weight_kg");
  const [period, setPeriod] = useState<Period>("3m");

  // modal state
  const [showModal, setShowModal]   = useState(false);
  const [formData,  setFormData]    = useState<Record<string, string>>({});
  const [isSaving,  setIsSaving]    = useState(false);
  const [saveOk,    setSaveOk]      = useState(false);

  // per-exercise progression + manual weight logging
  const [exProgress, setExProgress] = useState<ExerciseProgress[]>([]);
  const [exercises,  setExercises]  = useState<{ id: string; name: string }[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logQuery, setLogQuery] = useState("");          // typed / selected exercise name
  const [logExId,  setLogExId]  = useState<string | null>(null);
  const [showExList, setShowExList] = useState(false);
  const [logWeight,setLogWeight]= useState("");
  const [logReps,  setLogReps]  = useState("");
  const [savingLog,setSavingLog]= useState(false);

  /* ── Load ── */
  useEffect(() => {
    const raw = localStorage.getItem("gymos_member");
    if (!raw) { router.push(`/gym/${gymSlug}/login?role=member`); return; }
    const s = JSON.parse(raw) as MemberSession;
    setSession(s);
    loadAll(s.id);
  }, [gymSlug]);

  const loadAll = async (memberId: string, silent = false) => {
    if (!silent) setIsLoading(true);   // silent reload keeps scroll position after saving
    const [{ data: meas }, { data: logs }, { data: exs }] = await Promise.all([
      supabase
        .from("body_measurements")
        .select("*")
        .eq("member_id", memberId)
        .order("measured_at", { ascending: true }),
      supabase
        .from("progress_logs")
        .select("exercise_id, weight_kg, logged_at, exercise:exercises(name)")
        .eq("member_id", memberId)
        .not("weight_kg", "is", null)
        .order("logged_at", { ascending: true }),
      supabase
        .from("exercises")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
    ]);

    setMeasurements((meas as Measurement[]) ?? []);
    setExercises((exs as { id: string; name: string }[]) ?? []);

    // Per-exercise weekly progression + insights (shared with trainer view)
    const rawLogs = ((logs ?? []) as any[]).map(l => ({
      exercise_id: l.exercise_id,
      exercise_name: (l.exercise as any)?.name ?? l.exercise_id,
      weight_kg: l.weight_kg,
      logged_at: l.logged_at,
    }));
    setExProgress(buildExerciseProgress(rawLogs));

    setIsLoading(false);
  };

  /* ── Save new measurement ── */
  const saveMeasurement = async () => {
    if (!session) return;
    setIsSaving(true);
    const payload: Record<string, any> = {
      member_id: session.id,
      measured_at: new Date().toISOString(),
    };
    for (const f of MEASUREMENT_FIELDS) {
      if (formData[f.key]) payload[f.key] = parseFloat(formData[f.key]);
    }
    await supabase.from("body_measurements").insert(payload);
    setIsSaving(false);
    setSaveOk(true);
    setFormData({});
    setTimeout(() => { setSaveOk(false); setShowModal(false); }, 1500);
    loadAll(session.id, true);   // silent → no scroll jump
  };

  /* ── Save a manual weight entry for an exercise ── */
  const saveManualLog = async () => {
    if (!session || !logQuery.trim() || !logWeight) return;
    setSavingLog(true);
    await fetch("/api/member/log-weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: session.id,
        exercise_id: logExId ?? undefined,
        exercise_name: logExId ? undefined : logQuery.trim(),
        weight_kg: parseFloat(logWeight),
        reps: logReps || undefined,
      }),
    });
    setSavingLog(false);
    setLogQuery(""); setLogExId(null); setShowExList(false);
    setLogWeight(""); setLogReps("");
    setShowLogModal(false);
    loadAll(session.id, true);   // silent → no scroll jump
  };

  /* ── Derived data ── */
  const latest  = measurements.at(-1);
  const prev    = measurements.at(-2);

  const chartData = (() => {
    const cut = periodCutoff(period);
    return measurements
      .filter(m => !cut || new Date(m.measured_at) >= cut)
      .map(m => ({ date: fmtDate(m.measured_at), value: m[metric] }))
      .filter(d => d.value != null);
  })();

  /* ──────────────── LOADING ── */
  if (isLoading) {
    return embedded
      ? <div style={{ padding: "60px 0", display: "flex", justifyContent: "center" }}><GymLoader /></div>
      : <GymLoader fullScreen />;
  }

  /* ──────────────── RENDER ── */
  return (
    <div style={embedded
      ? { fontFamily: "var(--font-body)" }
      : { minHeight: "100vh", background: "var(--bg-root)", fontFamily: "var(--font-body)" }}>

      {/* ── HEADER ── */}
      {embedded ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "32px 16px 0", maxWidth: "640px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
            Mi Progreso
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="gymos-btn gymos-btn-primary"
            style={{ height: "44px", padding: "0 16px", fontSize: "14px", letterSpacing: "0.02em" }}
          >
            <Plus size={16} /> Registrar
          </button>
        </div>
      ) : (
        <header style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "var(--bg-glass)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "10px 16px", minHeight: "66px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
        }}>
          <BackButton onClick={() => router.push(`/gym/${gymSlug}/dashboard/member`)} tone="dark" />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "18px", color: "var(--text-primary)" }}>
            Mi Progreso
          </span>
          <button
            onClick={() => setShowModal(true)}
            className="gymos-btn gymos-btn-primary"
            style={{ height: "46px", padding: "0 18px", fontSize: "15px", letterSpacing: "0.02em" }}
          >
            <Plus size={18} /> Registrar
          </button>
        </header>
      )}

      <main style={{ maxWidth: "640px", margin: "0 auto", padding: embedded ? "20px 16px 24px" : "24px 16px 60px", display: "flex", flexDirection: "column", gap: "32px" }}>

        {/* ══════════════════════════════════════════
            SECCIÓN 0 — CALENDARIO DE ASISTENCIA
        ══════════════════════════════════════════ */}
        {session && (
          <section>
            <SectionTitle>Calendario de asistencia</SectionTitle>
            <WorkoutCalendar memberId={session.id} />
          </section>
        )}

        {/* ══════════════════════════════════════════
            SECCIÓN 1 — MEDIDAS CORPORALES
        ══════════════════════════════════════════ */}
        <section>
          <SectionTitle>Medidas corporales</SectionTitle>

          {!latest ? (
            <EmptyCard
              icon={<Scale size={28} color="var(--text-muted)" strokeWidth={1.5} />}
              text="Todavía no hay mediciones registradas."
              action={{ label: "Cargar primera medición", onClick: () => setShowModal(true) }}
            />
          ) : (
            <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "6px" }}>
              {MEASUREMENT_FIELDS.map(f => {
                const curr = (latest as any)[f.key] as number | undefined;
                const prv  = (prev  as any)?.[f.key] as number | undefined;
                if (curr == null) return null;
                const diff = delta(curr, prv);
                const isWeight = f.key === "weight_kg";
                // for weight: going down is good (green); for everything else: context varies — use neutral
                const good = diff == null ? null : isWeight ? diff < 0 : diff > 0;

                return (
                  <MeasureCard
                    key={f.key}
                    label={f.label}
                    value={curr}
                    unit={f.unit}
                    diff={diff}
                    good={good}
                  />
                );
              })}
            </div>
          )}

          {latest && (
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "8px 0 0", textAlign: "right" }}>
              Última medición: {fmtDate(latest.measured_at)}
            </p>
          )}
        </section>

        {/* ══════════════════════════════════════════
            SECCIÓN 2 — GRÁFICO DE EVOLUCIÓN
        ══════════════════════════════════════════ */}
        <section>
          <SectionTitle>Evolución</SectionTitle>

          {measurements.length < 2 ? (
            <EmptyCard
              icon={<TrendingUp size={28} color="var(--text-muted)" strokeWidth={1.5} />}
              text="Necesitás al menos 2 mediciones para ver la evolución."
            />
          ) : (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "20px 16px" }}>

              {/* Metric tabs */}
              <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginBottom: "16px", paddingBottom: "2px" }}>
                {METRICS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      padding: "6px 12px", borderRadius: "999px", flexShrink: 0,
                      border: `1px solid ${metric === m.key ? "var(--lime)" : "var(--border-default)"}`,
                      background: metric === m.key ? "var(--lime-dim)" : "var(--bg-elevated)",
                      color: metric === m.key ? "var(--lime)" : "var(--text-secondary)",
                      fontSize: "12px", fontWeight: 600, cursor: "pointer",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>

              {/* Chart */}
              {chartData.length < 2 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", padding: "20px 0" }}>
                  No hay suficientes datos para este período.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "10px", fontSize: "12px", color: "var(--text-primary)" }}
                      formatter={(v) => [`${v} ${METRICS.find(m => m.key === metric)?.unit ?? ""}`, METRICS.find(m => m.key === metric)?.label ?? ""]}
                    />
                    <Line type="monotone" dataKey="value" stroke="var(--lime)" strokeWidth={2.5} dot={{ fill: "var(--lime)", r: 4 }} activeDot={{ r: 6, fill: "var(--lime)" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Period selector */}
              <div style={{ display: "flex", gap: "6px", marginTop: "16px", justifyContent: "center" }}>
                {(["1m", "3m", "6m", "all"] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    style={{
                      padding: "4px 12px", borderRadius: "999px",
                      background: period === p ? "var(--lime)" : "var(--bg-elevated)",
                      border: `1px solid ${period === p ? "var(--lime)" : "var(--border-default)"}`,
                      color: period === p ? "#000" : "var(--text-secondary)",
                      fontSize: "12px", fontWeight: 600, cursor: "pointer",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {p === "1m" ? "1 mes" : p === "3m" ? "3 meses" : p === "6m" ? "6 meses" : "Todo"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════
            SECCIÓN 3 — PROGRESO POR EJERCICIO (semanal)
        ══════════════════════════════════════════ */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <SectionTitle>Progreso por ejercicio</SectionTitle>
            <button
              onClick={() => setShowLogModal(true)}
              className="gymos-btn gymos-btn-primary"
              style={{ height: "40px", padding: "0 14px", fontSize: "14px" }}
            >
              <Plus size={16} /> Cargar peso
            </button>
          </div>

          {exProgress.length === 0 ? (
            <EmptyCard
              icon={<TrendingUp size={28} color="var(--text-muted)" strokeWidth={1.5} />}
              text="Registrá el peso de tus ejercicios (al entrenar o con 'Cargar peso') para ver tu evolución semana a semana."
              action={{ label: "Cargar peso", onClick: () => setShowLogModal(true) }}
            />
          ) : (
            <>
              {/* Overall programmed conclusion */}
              <div style={{ background: "var(--lime-dim)", border: "1px solid rgba(158,255,0,0.25)", borderRadius: "14px", padding: "14px 16px", marginBottom: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
                <TrendingUp size={18} color="var(--lime)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
                  {overallInsight(exProgress)}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {exProgress.map((ex) => {
                  const isOpen = expandedPR === ex.exercise_id;
                  const trendColor = ex.trend === "up" ? "var(--success)" : ex.trend === "down" ? "var(--danger)" : "var(--text-muted)";
                  return (
                    <div key={ex.exercise_id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "14px", overflow: "hidden" }}>
                      <button
                        onClick={() => setExpandedPR(isOpen ? null : ex.exercise_id)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ex.exercise_name}
                          </p>
                          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>
                            {ex.first} kg → {ex.last} kg · {ex.weeks} {ex.weeks === 1 ? "semana" : "semanas"}
                          </p>
                        </div>
                        {ex.weeks >= 2 && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                            {ex.trend === "up" ? <ArrowUp size={14} color={trendColor} /> : ex.trend === "down" ? <ArrowDown size={14} color={trendColor} /> : <Minus size={14} color={trendColor} />}
                            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "15px", color: trendColor }}>
                              {ex.deltaKg > 0 ? "+" : ""}{ex.deltaKg}kg
                            </span>
                          </div>
                        )}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "18px", color: "var(--lime)", margin: 0 }}>{ex.max}</p>
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>máx kg</p>
                        </div>
                      </button>

                      {isOpen && (
                        <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "16px" }}>
                          {/* Programmed conclusion */}
                          <div style={{ background: "var(--bg-elevated)", borderRadius: "10px", padding: "10px 12px", marginBottom: "14px" }}>
                            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>{ex.insight}</p>
                          </div>

                          {ex.points.length >= 2 ? (
                            <ResponsiveContainer width="100%" height={160}>
                              <LineChart data={ex.points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} unit="" />
                                <Tooltip
                                  contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "10px", fontSize: "12px", color: "var(--text-primary)" }}
                                  formatter={(v) => [`${v} kg`, "Peso"]}
                                />
                                <Line type="monotone" dataKey="weight" stroke="var(--lime)" strokeWidth={2.5} dot={{ fill: "var(--lime)", r: 4 }} label={{ position: "top", fontSize: 11, fill: "var(--text-secondary)" }} />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                              Cargá el peso en otra semana para ver la evolución en el gráfico.
                            </p>
                          )}

                          {/* Weekly breakdown list */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "14px" }}>
                            {ex.points.map((p) => (
                              <div key={p.week} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: "8px" }}>
                                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>{p.label}</span>
                                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--lime)" }}>{p.weight} kg</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>

      {/* ══════════════════════════════════════════
          MODAL — Registrar medidas
      ══════════════════════════════════════════ */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0",
          }}
        >
          <div style={{
            width: "100%", maxWidth: "560px",
            background: "var(--bg-elevated)",
            borderRadius: "24px 24px 0 0",
            border: "1px solid var(--border-default)",
            maxHeight: "88vh", overflowY: "auto",
            padding: "24px 20px 40px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "18px", color: "var(--text-primary)", margin: 0 }}>
                Registrar medidas
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              {MEASUREMENT_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="gymos-label">{f.label} ({f.unit})</label>
                  <input
                    type="number"
                    step={f.step}
                    min={f.min}
                    max={f.max}
                    placeholder="—"
                    className="gymos-input"
                    style={{ height: "44px" }}
                    value={formData[f.key] ?? ""}
                    onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={saveMeasurement}
              disabled={isSaving || saveOk}
              className="gymos-btn gymos-btn-primary gymos-btn-full"
              style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}
            >
              {isSaving ? <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} /> : saveOk ? "Guardado" : "Guardar medidas"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL — Cargar peso de un ejercicio
      ══════════════════════════════════════════ */}
      {showLogModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowLogModal(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div style={{ width: "100%", maxWidth: "560px", background: "var(--bg-elevated)", borderRadius: "24px 24px 0 0", border: "1px solid var(--border-default)", maxHeight: "88vh", overflowY: "auto", padding: "24px 20px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "18px", color: "var(--text-primary)", margin: 0 }}>
                Cargar peso
              </h3>
              <button onClick={() => setShowLogModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 20px", lineHeight: 1.5 }}>
              Registrá cuánto levantaste en un ejercicio. Se suma a tu evolución semanal.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              {/* Searchable exercise picker */}
              <div style={{ position: "relative" }}>
                <label className="gymos-label">Ejercicio</label>
                <input
                  type="text"
                  className="gymos-input"
                  placeholder="Buscá o escribí un ejercicio..."
                  value={logQuery}
                  onChange={e => { setLogQuery(e.target.value); setLogExId(null); setShowExList(true); }}
                  onFocus={() => setShowExList(true)}
                  autoComplete="off"
                />
                {showExList && logQuery.trim().length > 0 && (() => {
                  const q = logQuery.trim().toLowerCase();
                  const matches = exercises.filter(ex => ex.name.toLowerCase().includes(q)).slice(0, 8);
                  const exact = exercises.some(ex => ex.name.toLowerCase() === q);
                  return (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                      marginTop: "4px", maxHeight: "240px", overflowY: "auto",
                      background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                      borderRadius: "12px", boxShadow: "var(--shadow-elevated)",
                    }}>
                      {matches.map(ex => (
                        <button key={ex.id} type="button"
                          onClick={() => { setLogExId(ex.id); setLogQuery(ex.name); setShowExList(false); }}
                          style={{ width: "100%", textAlign: "left", padding: "12px 14px", background: "none", border: "none", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer", fontSize: "15px", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                          {ex.name}
                        </button>
                      ))}
                      {!exact && (
                        <button type="button"
                          onClick={() => { setLogExId(null); setShowExList(false); }}
                          style={{ width: "100%", textAlign: "left", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "var(--lime)", fontWeight: 700, fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: "8px" }}>
                          <Plus size={16} /> Usar "{logQuery.trim()}"
                        </button>
                      )}
                      {matches.length === 0 && exact && (
                        <p style={{ padding: "12px 14px", fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>Sin resultados</p>
                      )}
                    </div>
                  );
                })()}
                {logExId === null && logQuery.trim() && !showExList && (
                  <p style={{ fontSize: "12px", color: "var(--lime)", margin: "6px 0 0", fontWeight: 600 }}>
                    Se guardará como ejercicio nuevo: "{logQuery.trim()}"
                  </p>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="gymos-label">Peso (kg)</label>
                  <input type="number" step="0.5" min="0" placeholder="Ej: 70" className="gymos-input" style={{ height: "52px" }} value={logWeight} onChange={e => setLogWeight(e.target.value)} />
                </div>
                <div>
                  <label className="gymos-label">Reps (opcional)</label>
                  <input type="text" placeholder="Ej: 10" className="gymos-input" style={{ height: "52px" }} value={logReps} onChange={e => setLogReps(e.target.value)} />
                </div>
              </div>
            </div>

            <button
              onClick={saveManualLog}
              disabled={savingLog || !logQuery.trim() || !logWeight}
              className="gymos-btn gymos-btn-primary gymos-btn-full"
              style={{ letterSpacing: "0.04em", textTransform: "uppercase", opacity: (!logQuery.trim() || !logWeight) ? 0.5 : 1 }}
            >
              {savingLog ? <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} /> : "Guardar peso"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Sub-components ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "var(--font-display)", fontWeight: 800,
      fontSize: "17px", color: "var(--text-primary)",
      letterSpacing: "-0.01em", margin: "0 0 14px",
    }}>
      {children}
    </h2>
  );
}

function MeasureCard({ label, value, unit, diff, good }: {
  label: string; value: number; unit: string; diff: number | null; good: boolean | null;
}) {
  return (
    <div style={{
      flexShrink: 0, minWidth: "110px",
      background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
      borderRadius: "14px", padding: "14px 14px 12px",
    }}>
      <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "22px", color: "var(--text-primary)", margin: "0 0 6px" }}>
        {value}<span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginLeft: "3px" }}>{unit}</span>
      </p>
      {diff != null && (
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          {diff === 0
            ? <Minus size={12} color="var(--text-muted)" />
            : diff > 0
              ? <ArrowUp size={12} color={good === true ? "var(--success)" : good === false ? "var(--danger)" : "var(--text-secondary)"} />
              : <ArrowDown size={12} color={good === false ? "var(--danger)" : good === true ? "var(--success)" : "var(--text-secondary)"} />
          }
          <span style={{
            fontSize: "12px", fontWeight: 700,
            color: diff === 0
              ? "var(--text-muted)"
              : good === true ? "var(--success)" : good === false ? "var(--danger)" : "var(--text-secondary)",
          }}>
            {diff > 0 ? "+" : ""}{diff} {unit}
          </span>
        </div>
      )}
      {diff == null && <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>Primera medición</p>}
    </div>
  );
}

function EmptyCard({ icon, text, action }: { icon: React.ReactNode; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "32px 20px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>{icon}</div>
      <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: action ? "0 0 14px" : 0 }}>{text}</p>
      {action && (
        <button onClick={action.onClick} className="gymos-btn gymos-btn-secondary" style={{ fontSize: "13px", height: "38px" }}>
          <Plus size={14} /> {action.label}
        </button>
      )}
    </div>
  );
}
