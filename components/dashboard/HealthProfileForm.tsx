"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { healthProfileSchema, type HealthProfileForm } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Minus, Plus } from "lucide-react";

/* ── Constants ─────────────────────────────────────────────── */

const GOALS = [
  { value: "lose_weight",   label: "Bajar de peso",     desc: "Reducir grasa corporal" },
  { value: "gain_muscle",   label: "Ganar músculo",     desc: "Hipertrofia y fuerza" },
  { value: "tone",          label: "Tonificar",         desc: "Definición muscular" },
  { value: "endurance",     label: "Resistencia",       desc: "Cardio y capacidad aeróbica" },
  { value: "general_health",label: "Salud general",     desc: "Bienestar y hábitos activos" },
] as const;

const LEVELS = [
  { value: "beginner",     label: "Principiante", desc: "Menos de 1 año de entrenamiento" },
  { value: "intermediate", label: "Intermedio",   desc: "Entre 1 y 3 años" },
  { value: "advanced",     label: "Avanzado",     desc: "Más de 3 años" },
] as const;

/* ── Shared style tokens ─────────────────────────────────────── */

const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "16px",
  padding: "24px",
};

const sectionNum = (n: number): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  background: "var(--lime-dim)",
  border: "1px solid rgba(158,255,0,0.25)",
  fontSize: "12px",
  fontWeight: 700,
  color: "var(--lime)",
  flexShrink: 0,
  fontFamily: "var(--font-display)",
});

/* ── Component ───────────────────────────────────────────────── */

interface MemberSession { id: string; name: string; gym_slug: string; }

export default function HealthProfileForm({ gymSlug }: { gymSlug: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [session, setSession] = useState<MemberSession | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<HealthProfileForm>({
    resolver: zodResolver(healthProfileSchema),
    defaultValues: {
      days_per_week: 3,
      uses_supplements: false,
    },
  });

  const usesSupplements = watch("uses_supplements");
  const selectedGoal = watch("goal");
  const selectedLevel = watch("experience_level");
  const daysPerWeek = watch("days_per_week");

  /* Load session + existing profile */
  useEffect(() => {
    const raw = localStorage.getItem("gymos_member");
    if (!raw) { router.push(`/gym/${gymSlug}/login?role=member`); return; }
    const s = JSON.parse(raw) as MemberSession;
    setSession(s);

    supabase
      .from("member_goals")
      .select("*")
      .eq("member_id", s.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          reset({
            goal: data.goal,
            experience_level: data.experience_level,
            days_per_week: data.days_per_week ?? 3,
            injuries: data.injuries ?? "",
            uses_supplements: data.uses_supplements ?? false,
            supplements_detail: data.supplements_detail ?? "",
            objectives_detail: data.objectives_detail ?? "",
          });
        }
        setIsLoading(false);
      });
  }, [gymSlug]);

  const onSubmit = async (data: HealthProfileForm) => {
    if (!session) return;
    setIsSaving(true);
    setSaved(false);

    const payload = {
      member_id: session.id,
      goal: data.goal,
      experience_level: data.experience_level,
      days_per_week: data.days_per_week,
      injuries: data.injuries?.trim() || null,
      uses_supplements: data.uses_supplements,
      supplements_detail: data.uses_supplements ? data.supplements_detail?.trim() || null : null,
      objectives_detail: data.objectives_detail?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("member_goals").upsert(payload, { onConflict: "member_id" });

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-root)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="gymos-spinner-lg" />
      </div>
    );
  }

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
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500,
            fontFamily: "inherit", padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          Volver
        </button>
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: "15px", color: "var(--text-primary)",
        }}>
          Perfil de Salud
        </span>
        <div style={{ width: "60px" }} />
      </header>

      {/* ── BODY ── */}
      <main style={{ maxWidth: "560px", margin: "0 auto", padding: "28px 20px 60px" }}>

        {/* Intro */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: "clamp(22px, 5vw, 28px)", color: "var(--text-primary)",
            letterSpacing: "-0.02em", margin: "0 0 8px",
          }}>
            Cuestionario de salud
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
            Esta información le permite a tu profesor diseñar un plan completamente personalizado.
            Respondé con la mayor precisión posible.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* ── 1. OBJETIVO ── */}
          <Section number={1} title="Objetivo principal" subtitle="¿Para qué venís a entrenar?">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {GOALS.map(g => {
                const active = selectedGoal === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setValue("goal", g.value, { shouldValidate: true })}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 16px", borderRadius: "12px", cursor: "pointer",
                      border: `1.5px solid ${active ? "var(--lime)" : "var(--border-default)"}`,
                      background: active ? "var(--lime-dim)" : "var(--bg-elevated)",
                      transition: "all 0.18s",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <p style={{
                        fontFamily: "var(--font-display)", fontWeight: 700,
                        fontSize: "14px", margin: 0,
                        color: active ? "var(--lime)" : "var(--text-primary)",
                      }}>
                        {g.label}
                      </p>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                        {g.desc}
                      </p>
                    </div>
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                      border: `2px solid ${active ? "var(--lime)" : "var(--border-hover)"}`,
                      background: active ? "var(--lime)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {active && <Check size={11} color="#000" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.goal && <FieldError msg={errors.goal.message!} />}
          </Section>

          {/* ── 2. NIVEL ── */}
          <Section number={2} title="Nivel de experiencia" subtitle="Sé honesto, esto define la intensidad.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {LEVELS.map(l => {
                const active = selectedLevel === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setValue("experience_level", l.value, { shouldValidate: true })}
                    style={{
                      padding: "14px 8px", borderRadius: "12px", cursor: "pointer",
                      border: `1.5px solid ${active ? "var(--lime)" : "var(--border-default)"}`,
                      background: active ? "var(--lime-dim)" : "var(--bg-elevated)",
                      transition: "all 0.18s", textAlign: "center",
                    }}
                  >
                    <p style={{
                      fontFamily: "var(--font-display)", fontWeight: 700,
                      fontSize: "13px", margin: "0 0 4px",
                      color: active ? "var(--lime)" : "var(--text-primary)",
                    }}>
                      {l.label}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineHeight: 1.3 }}>
                      {l.desc}
                    </p>
                  </button>
                );
              })}
            </div>
            {errors.experience_level && <FieldError msg={errors.experience_level.message!} />}
          </Section>

          {/* ── 3. DÍAS ── */}
          <Section number={3} title="Días disponibles por semana" subtitle="¿Cuántos días podés entrenar?">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", padding: "8px 0" }}>
              <button
                type="button"
                disabled={daysPerWeek <= 1}
                onClick={() => setValue("days_per_week", Math.max(1, (daysPerWeek ?? 1) - 1))}
                style={{
                  width: "48px", height: "48px", borderRadius: "50%",
                  background: daysPerWeek <= 1 ? "var(--bg-elevated)" : "var(--bg-card)",
                  border: `1.5px solid ${daysPerWeek <= 1 ? "var(--border-subtle)" : "var(--border-default)"}`,
                  cursor: daysPerWeek <= 1 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: daysPerWeek <= 1 ? "var(--text-muted)" : "var(--text-primary)",
                  transition: "all 0.15s", flexShrink: 0,
                }}
              >
                <Minus size={18} />
              </button>

              <div style={{ textAlign: "center", minWidth: "80px" }}>
                <span style={{
                  fontFamily: "var(--font-display)", fontWeight: 800,
                  fontSize: "48px", color: "var(--lime)", lineHeight: 1,
                  display: "block",
                }}>
                  {daysPerWeek ?? 3}
                </span>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  {(daysPerWeek ?? 3) === 1 ? "día" : "días"}
                </span>
              </div>

              <button
                type="button"
                disabled={daysPerWeek >= 6}
                onClick={() => setValue("days_per_week", Math.min(6, (daysPerWeek ?? 1) + 1))}
                style={{
                  width: "48px", height: "48px", borderRadius: "50%",
                  background: daysPerWeek >= 6 ? "var(--bg-elevated)" : "var(--bg-card)",
                  border: `1.5px solid ${daysPerWeek >= 6 ? "var(--border-subtle)" : "var(--lime)"}`,
                  cursor: daysPerWeek >= 6 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: daysPerWeek >= 6 ? "var(--text-muted)" : "var(--lime)",
                  transition: "all 0.15s", flexShrink: 0,
                }}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Dot indicators */}
            <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px" }}>
              {[1,2,3,4,5,6].map(n => (
                <div key={n} style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: n <= (daysPerWeek ?? 3) ? "var(--lime)" : "var(--border-default)",
                  transition: "background 0.15s",
                }} />
              ))}
            </div>
          </Section>

          {/* ── 4. LESIONES ── */}
          <Section number={4} title="Lesiones o limitaciones físicas" subtitle="Dejá en blanco si no tenés ninguna.">
            <textarea
              rows={4}
              placeholder="Ej: dolor en la rodilla derecha, hernia de disco L4-L5, sin restricciones actuales..."
              className="gymos-input"
              style={{
                height: "auto", resize: "none", padding: "14px 16px",
                lineHeight: "1.6", fontSize: "14px",
                ...(errors.injuries ? { borderColor: "var(--danger)" } : {}),
              }}
              {...register("injuries")}
            />
            {errors.injuries && <FieldError msg={errors.injuries.message!} />}
          </Section>

          {/* ── 5. SUPLEMENTOS ── */}
          <Section number={5} title="Suplementos o medicación" subtitle="Importante para que el profe pueda planificar correctamente.">
            <Controller
              name="uses_supplements"
              control={control}
              render={({ field }) => (
                <div style={{ display: "flex", gap: "8px" }}>
                  {[false, true].map(val => {
                    const active = field.value === val;
                    return (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => {
                          field.onChange(val);
                          if (!val) setValue("supplements_detail", "");
                        }}
                        style={{
                          flex: 1, height: "46px", borderRadius: "12px", cursor: "pointer",
                          border: `1.5px solid ${active ? "var(--lime)" : "var(--border-default)"}`,
                          background: active ? "var(--lime-dim)" : "var(--bg-elevated)",
                          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px",
                          color: active ? "var(--lime)" : "var(--text-secondary)",
                          transition: "all 0.18s",
                        }}
                      >
                        {val ? "Si" : "No"}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {usesSupplements && (
              <div style={{ marginTop: "12px" }}>
                <label className="gymos-label" style={{ marginBottom: "8px" }}>
                  Describí cuáles
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: proteína whey post-entreno, creatina 5g/día, ibuprofeno ocasional..."
                  className="gymos-input"
                  style={{
                    height: "auto", resize: "none", padding: "14px 16px",
                    lineHeight: "1.6", fontSize: "14px",
                    ...(errors.supplements_detail ? { borderColor: "var(--danger)" } : {}),
                  }}
                  {...register("supplements_detail")}
                />
                {errors.supplements_detail && <FieldError msg={errors.supplements_detail.message!} />}
              </div>
            )}
          </Section>

          {/* ── 6. OBJETIVOS DETALLADOS ── */}
          <Section number={6} title="Objetivos a largo plazo" subtitle="Contale a tu profesor qué querés lograr en detalle.">
            <textarea
              rows={4}
              placeholder="Ej: quiero bajar 8kg en 3 meses para el verano, mejorar mi postura y volver a correr sin dolor..."
              className="gymos-input"
              style={{
                height: "auto", resize: "none", padding: "14px 16px",
                lineHeight: "1.6", fontSize: "14px",
                ...(errors.objectives_detail ? { borderColor: "var(--danger)" } : {}),
              }}
              {...register("objectives_detail")}
            />
            {errors.objectives_detail && <FieldError msg={errors.objectives_detail.message!} />}
          </Section>

          {/* ── SUBMIT ── */}
          <button
            type="submit"
            disabled={isSaving}
            className="gymos-btn gymos-btn-primary gymos-btn-full"
            style={{
              marginTop: "8px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? (
              <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} />
            ) : saved ? (
              <>
                <Check size={18} strokeWidth={3} />
                Guardado
              </>
            ) : (
              <>
                Guardar perfil
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {saved && (
            <p style={{
              textAlign: "center", fontSize: "13px",
              color: "var(--success)", fontWeight: 500,
            }}>
              Tu perfil fue guardado. Tu profesor ya puede verlo.
            </p>
          )}

        </form>
      </main>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function Section({
  number, title, subtitle, children,
}: {
  number: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
        <div style={sectionNum(number)}>{number}</div>
        <div>
          <p style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "15px", color: "var(--text-primary)", margin: 0,
          }}>
            {title}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p style={{
      fontSize: "12px", color: "var(--danger)",
      margin: "8px 0 0", fontWeight: 500,
    }}>
      {msg}
    </p>
  );
}
