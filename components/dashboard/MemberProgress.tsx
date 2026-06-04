"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft, ArrowUp, ArrowDown, Minus,
  Plus, X, Loader2, Trophy, TrendingUp,
  Scale, Activity,
} from "lucide-react";

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

export default function MemberProgress({ gymSlug }: { gymSlug: string }) {
  const supabase = createClient();
  const router   = useRouter();

  const [session,      setSession]      = useState<MemberSession | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [prs,          setPRs]          = useState<PR[]>([]);
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

  /* ── Load ── */
  useEffect(() => {
    const raw = localStorage.getItem("gymos_member");
    if (!raw) { router.push(`/gym/${gymSlug}`); return; }
    const s = JSON.parse(raw) as MemberSession;
    setSession(s);
    loadAll(s.id);
  }, [gymSlug]);

  const loadAll = async (memberId: string) => {
    setIsLoading(true);
    const [{ data: meas }, { data: logs }] = await Promise.all([
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
    ]);

    setMeasurements((meas as Measurement[]) ?? []);

    // Build PRs grouped by exercise
    const map: Record<string, { name: string; entries: { date: string; weight: number }[] }> = {};
    for (const log of (logs ?? []) as any[]) {
      const id   = log.exercise_id as string;
      const name = (log.exercise as any)?.name ?? id;
      if (!map[id]) map[id] = { name, entries: [] };
      map[id].entries.push({ date: log.logged_at, weight: log.weight_kg });
    }
    const prList: PR[] = Object.entries(map).map(([id, { name, entries }]) => {
      const sorted  = [...entries].sort((a, b) => b.weight - a.weight);
      const maxW    = sorted[0].weight;
      const maxDate = sorted.find(e => e.weight === maxW)!.date;
      return {
        exercise_id: id,
        exercise_name: name,
        max_weight: maxW,
        achieved_at: maxDate,
        history: entries.map(e => ({ date: fmtDate(e.date), weight: e.weight })),
      };
    }).sort((a, b) => b.max_weight - a.max_weight);

    setPRs(prList);
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
    loadAll(session.id);
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
  if (isLoading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-root)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="gymos-spinner-lg" />
    </div>
  );

  /* ──────────────── RENDER ── */
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-root)", fontFamily: "var(--font-body)" }}>

      {/* ── HEADER ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "var(--bg-glass)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 20px", height: "56px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={() => router.push(`/gym/${gymSlug}/dashboard/member`)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500, fontFamily: "inherit", padding: 0 }}
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>
          Mi Progreso
        </span>
        <button
          onClick={() => setShowModal(true)}
          className="gymos-btn gymos-btn-primary"
          style={{ height: "34px", padding: "0 14px", fontSize: "13px", letterSpacing: "0.02em" }}
        >
          <Plus size={14} /> Registrar
        </button>
      </header>

      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "24px 16px 60px", display: "flex", flexDirection: "column", gap: "32px" }}>

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
            SECCIÓN 3 — RÉCORDS PERSONALES
        ══════════════════════════════════════════ */}
        <section>
          <SectionTitle>Récords personales</SectionTitle>

          {prs.length === 0 ? (
            <EmptyCard
              icon={<Trophy size={28} color="var(--text-muted)" strokeWidth={1.5} />}
              text="Completá entrenamientos registrando el peso para ver tus récords."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {prs.map((pr, i) => {
                const isOpen = expandedPR === pr.exercise_id;
                return (
                  <div key={pr.exercise_id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "14px", overflow: "hidden" }}>
                    <button
                      onClick={() => setExpandedPR(isOpen ? null : pr.exercise_id)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: "12px",
                        padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      {/* Trophy for top 3 */}
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                        background: i < 3 ? "rgba(245,197,24,0.12)" : "var(--bg-elevated)",
                        border: `1px solid ${i < 3 ? "rgba(245,197,24,0.3)" : "var(--border-default)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: i === 0 ? "#F5C518" : i === 1 ? "#A8A9AD" : i === 2 ? "#CD7F32" : "var(--text-muted)",
                      }}>
                        {i < 3
                          ? <Trophy size={16} strokeWidth={2} />
                          : <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13px", color: "var(--text-muted)" }}>{i + 1}</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {pr.exercise_name}
                        </p>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                          {fmtDate(pr.achieved_at)}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "18px", color: "var(--lime)", margin: 0 }}>
                          {pr.max_weight}
                        </p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>kg</p>
                      </div>
                    </button>

                    {/* Expanded chart */}
                    {isOpen && pr.history.length >= 2 && (
                      <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "16px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px" }}>
                          Evolución del peso
                        </p>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={pr.history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                            <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                            <Tooltip
                              contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "10px", fontSize: "12px", color: "var(--text-primary)" }}
                              formatter={(v) => [`${v} kg`, "Peso"]}
                            />
                            <Line type="monotone" dataKey="weight" stroke="var(--lime)" strokeWidth={2} dot={{ fill: "var(--lime)", r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {isOpen && pr.history.length < 2 && (
                      <p style={{ padding: "12px 16px", fontSize: "13px", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>
                        Necesitás más sesiones registradas para ver la evolución.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
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
