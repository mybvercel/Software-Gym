"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";

const GOALS = [
  { value: "lose_weight",    label: "Bajar de peso",    desc: "Reducir grasa corporal" },
  { value: "gain_muscle",    label: "Ganar músculo",    desc: "Hipertrofia y fuerza" },
  { value: "tone",           label: "Tonificar",        desc: "Definición muscular" },
  { value: "endurance",      label: "Resistencia",      desc: "Cardio y capacidad aeróbica" },
  { value: "general_health", label: "Salud general",    desc: "Bienestar y hábitos activos" },
] as const;

const LEVELS = [
  { value: "beginner",     label: "Principiante", desc: "Menos de 1 año" },
  { value: "intermediate", label: "Intermedio",   desc: "1 a 3 años" },
  { value: "advanced",     label: "Avanzado",     desc: "Más de 3 años" },
] as const;

interface MemberSession { id: string; name: string; gym_slug: string; gym_id: string; }

interface Props { gymSlug: string }

export default function MemberOnboarding({ gymSlug }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — personal data
  const [bDay,   setBDay]   = useState("");
  const [bMonth, setBMonth] = useState("");
  const [bYear,  setBYear]  = useState("");
  const birthDate = (bDay && bMonth && bYear)
    ? `${bYear}-${bMonth.padStart(2, "0")}-${bDay.padStart(2, "0")}`
    : "";
  const [gender,    setGender]    = useState("");
  const [height,    setHeight]    = useState("");

  // Step 2 — goal + level
  const [goal,      setGoal]      = useState("");
  const [level,     setLevel]     = useState("");
  const [daysWeek,  setDaysWeek]  = useState(3);

  // Step 3 — objectives detail
  const [injuries,  setInjuries]  = useState("");
  const [objectives, setObjectives] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const session: MemberSession | null = (() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("gymos_member");
    return raw ? JSON.parse(raw) : null;
  })();

  const save = async () => {
    if (!session) return;
    setIsSaving(true);
    setError(null);

    const res = await fetch("/api/member/complete-onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: session.id,
        birth_date: birthDate || null,
        gender: gender || null,
        height_cm: height ? parseFloat(height) : null,
        goal,
        experience_level: level,
        days_per_week: daysWeek,
        injuries: injuries || null,
        objectives_detail: objectives || null,
      }),
    });

    setIsSaving(false);

    if (!res.ok) {
      setError("No se pudo guardar. Intentá de nuevo.");
      return;
    }

    router.push(`/gym/${gymSlug}/dashboard/member`);
  };

  const firstName = session?.name?.split(" ")[0] ?? "Alumno";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-root)", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "48px 24px 28px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
          Paso {step} de 3
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(22px,5vw,28px)", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
          {step === 1 ? `Hola, ${firstName}` : step === 2 ? "Tu objetivo" : "Últimos detalles"}
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
          {step === 1 ? "Contanos un poco sobre vos para personalizar tu experiencia." : step === 2 ? "Esto ayuda a tu profesor a diseñar el plan ideal." : "Opcional, pero muy útil para tu profe."}
        </p>

        {/* Progress bar */}
        <div style={{ maxWidth: "300px", margin: "20px auto 0", height: "4px", background: "var(--border-subtle)", borderRadius: "999px" }}>
          <div style={{ height: "4px", width: `${(step / 3) * 100}%`, background: "var(--lime)", borderRadius: "999px", transition: "width 0.4s ease", boxShadow: "var(--lime-glow)" }} />
        </div>
      </div>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: "520px", width: "100%", margin: "0 auto", padding: "0 20px 40px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* ── STEP 1: Personal data ── */}
        {step === 1 && (
          <>
            <Card title="Fecha de nacimiento">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: "8px" }}>
                <select className="gymos-select" value={bDay} onChange={e => setBDay(e.target.value)}>
                  <option value="">Día</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
                <select className="gymos-select" value={bMonth} onChange={e => setBMonth(e.target.value)}>
                  <option value="">Mes</option>
                  {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m, i) => (
                    <option key={m} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
                <select className="gymos-select" value={bYear} onChange={e => setBYear(e.target.value)}>
                  <option value="">Año</option>
                  {Array.from({ length: 84 }, (_, i) => new Date().getFullYear() - 10 - i).map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
            </Card>

            <Card title="Género">
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { v: "male",   l: "Masculino" },
                  { v: "female", l: "Femenino" },
                  { v: "other",  l: "Prefiero no decir" },
                ].map(({ v, l }) => (
                  <button
                    key={v}
                    onClick={() => setGender(v)}
                    style={{
                      flex: 1, height: "42px", borderRadius: "10px", cursor: "pointer",
                      border: `1.5px solid ${gender === v ? "var(--lime)" : "var(--border-default)"}`,
                      background: gender === v ? "var(--lime-dim)" : "var(--bg-elevated)",
                      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "12px",
                      color: gender === v ? "var(--lime)" : "var(--text-secondary)",
                    }}
                  >{l}</button>
                ))}
              </div>
            </Card>

            <Card title="Altura">
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  inputMode="numeric"
                  min="100"
                  max="250"
                  placeholder="Ej: 175"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className="gymos-input"
                  style={{ paddingRight: "48px" }}
                />
                <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", color: "var(--text-muted)", fontWeight: 600 }}>
                  cm
                </span>
              </div>
            </Card>
          </>
        )}

        {/* ── STEP 2: Goal + Level + Days ── */}
        {step === 2 && (
          <>
            <Card title="Objetivo principal">
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {GOALS.map(g => {
                  const active = goal === g.value;
                  return (
                    <button key={g.value} onClick={() => setGoal(g.value)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px", borderRadius: "10px", cursor: "pointer", textAlign: "left",
                      border: `1.5px solid ${active ? "var(--lime)" : "var(--border-default)"}`,
                      background: active ? "var(--lime-dim)" : "var(--bg-elevated)",
                    }}>
                      <div>
                        <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: active ? "var(--lime)" : "var(--text-primary)", margin: 0 }}>{g.label}</p>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0" }}>{g.desc}</p>
                      </div>
                      {active && <Check size={16} color="var(--lime)" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card title="Nivel de experiencia">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
                {LEVELS.map(l => {
                  const active = level === l.value;
                  return (
                    <button key={l.value} onClick={() => setLevel(l.value)} style={{
                      padding: "12px 8px", borderRadius: "10px", cursor: "pointer", textAlign: "center",
                      border: `1.5px solid ${active ? "var(--lime)" : "var(--border-default)"}`,
                      background: active ? "var(--lime-dim)" : "var(--bg-elevated)",
                    }}>
                      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13px", color: active ? "var(--lime)" : "var(--text-primary)", margin: "0 0 4px" }}>{l.label}</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineHeight: 1.3 }}>{l.desc}</p>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card title="Días disponibles por semana">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px" }}>
                <button onClick={() => setDaysWeek(d => Math.max(1, d - 1))} disabled={daysWeek <= 1} style={{ width: "44px", height: "44px", borderRadius: "50%", border: "1.5px solid var(--border-default)", background: "var(--bg-elevated)", cursor: daysWeek <= 1 ? "not-allowed" : "pointer", color: "var(--text-primary)", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "44px", color: "var(--lime)", lineHeight: 1 }}>{daysWeek}</span>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>días</p>
                </div>
                <button onClick={() => setDaysWeek(d => Math.min(6, d + 1))} disabled={daysWeek >= 6} style={{ width: "44px", height: "44px", borderRadius: "50%", border: `1.5px solid ${daysWeek >= 6 ? "var(--border-subtle)" : "var(--lime)"}`, background: "var(--bg-elevated)", cursor: daysWeek >= 6 ? "not-allowed" : "pointer", color: daysWeek >= 6 ? "var(--text-muted)" : "var(--lime)", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </div>
            </Card>
          </>
        )}

        {/* ── STEP 3: Injuries + objectives ── */}
        {step === 3 && (
          <>
            <Card title="Lesiones o limitaciones físicas">
              <textarea
                rows={3}
                placeholder="Ej: dolor en la rodilla derecha, sin lesiones actuales..."
                className="gymos-input"
                style={{ height: "auto", resize: "none", padding: "12px 14px", fontSize: "14px", lineHeight: 1.6 }}
                value={injuries}
                onChange={e => setInjuries(e.target.value)}
              />
            </Card>

            <Card title="Objetivos a largo plazo">
              <textarea
                rows={3}
                placeholder="Ej: quiero bajar 8kg para el verano y mejorar mi postura..."
                className="gymos-input"
                style={{ height: "auto", resize: "none", padding: "12px 14px", fontSize: "14px", lineHeight: 1.6 }}
                value={objectives}
                onChange={e => setObjectives(e.target.value)}
              />
            </Card>

            {error && (
              <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.2)" }}>
                <p style={{ fontSize: "13px", color: "var(--danger)", margin: 0 }}>{error}</p>
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          {step > 1 && (
            <button
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              style={{ flex: 1, height: "52px", borderRadius: "12px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "var(--text-secondary)" }}
            >
              Atrás
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(s => (s + 1) as 2 | 3)}
              disabled={step === 2 && (!goal || !level)}
              className="gymos-btn gymos-btn-primary"
              style={{ flex: 2, height: "52px", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "14px", opacity: (step === 2 && (!goal || !level)) ? 0.5 : 1 }}
            >
              Continuar <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={save}
              disabled={isSaving}
              className="gymos-btn gymos-btn-primary"
              style={{ flex: 2, height: "52px", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "14px" }}
            >
              {isSaving
                ? <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} />
                : <><Check size={16} strokeWidth={3} /> Empezar</>}
            </button>
          )}
        </div>

        {/* Skip */}
        <button
          onClick={() => router.push(`/gym/${gymSlug}/dashboard/member`)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "4px" }}
        >
          Completar más tarde
        </button>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "18px" }}>
      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", margin: "0 0 12px" }}>{title}</p>
      {children}
    </div>
  );
}
