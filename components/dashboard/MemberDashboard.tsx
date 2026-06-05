"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Routine, RoutineDay, RoutineExercise } from "@/lib/types";
import { ExerciseDetail } from "@/components/exercises/ExerciseDetail";
import { Dumbbell, Clock, Home, ListChecks, TrendingUp, User, LogOut, ChevronRight, Check, Play, ClipboardList, PartyPopper, Moon, Sun, MessageSquare, Send, Loader2 } from "lucide-react";
import WorkoutCalendar from "./WorkoutCalendar";
import GymLoader from "@/components/ui/GymLoader";
import { arWeekday, arFormat } from "@/lib/datetime";

interface MemberSession {
  id: string;
  name: string;
  gym_id: string;
  gym_slug: string;
}

interface Props { gymSlug: string }

export default function MemberDashboard({ gymSlug }: Props) {
  const supabase = createClient();
  const [session, setSession] = useState<MemberSession | null>(null);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [todayDay, setTodayDay] = useState<RoutineDay | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<RoutineExercise | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [measurements, setMeasurements] = useState<{ measured_at: string; weight_kg?: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "exercises" | "progress" | "profile">("home");
  const [trainingStarted, setTrainingStarted] = useState(false);
  const router = useRouter();

  // Theme + feedback
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [fbComment, setFbComment] = useState("");
  const [fbSending, setFbSending] = useState(false);
  const [fbSent, setFbSent] = useState(false);

  useEffect(() => {
    const t = (localStorage.getItem("gymos_theme") as "dark" | "light") || "dark";
    setTheme(t === "light" ? "light" : "dark");
  }, []);

  const applyTheme = (t: "dark" | "light") => {
    setTheme(t);
    localStorage.setItem("gymos_theme", t);
    document.documentElement.dataset.theme = t;
  };

  const sendFeedback = async () => {
    if (!session || !fbComment.trim()) return;
    setFbSending(true);
    try {
      await fetch("/api/member/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: session.id, comment: fbComment }),
      });
      setFbSent(true);
      setFbComment("");
      setTimeout(() => setFbSent(false), 3000);
    } finally {
      setFbSending(false);
    }
  };

  useEffect(() => {
    // Lazily auto-close any workout abandoned for ≥3h (no external cron needed)
    fetch("/api/cron/close-stale-workouts", { method: "POST" }).catch(() => {});

    // Primary: read from localStorage (set by login API alongside the HttpOnly cookie)
    // The HttpOnly cookie is validated server-side by middleware before this component loads
    const saved = localStorage.getItem("gymos_member");
    if (saved) {
      try {
        const s = JSON.parse(saved) as MemberSession;
        setSession(s);
        loadData(s);
        return;
      } catch { /* fall through */ }
    }
    // If localStorage is missing (cleared manually), middleware already guards the route,
    // so this path means the session cookie expired too — redirect to login
    window.location.href = `/gym/${gymSlug}`;
  }, [gymSlug]);

  const loadData = async (s: MemberSession) => {
    setIsLoading(true);
    try {
      const { data: routineData } = await supabase
        .from("routines")
        .select(`*, routine_days(*, routine_exercises(*, exercise:exercises(*)))`)
        .eq("member_id", s.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (routineData) {
        setRoutine(routineData);
        const days = routineData.routine_days ?? [];
        if (days.length > 0) {
          // day_number stores the ISO weekday (1=Mon … 7=Sun), en hora de Córdoba.
          const todayISO = arWeekday();
          const match = days.find((d: RoutineDay) => d.day_number === todayISO);
          setTodayDay(match ?? null);                  // null → rest day
        }
      }

      const { data: measureData } = await supabase
        .from("body_measurements")
        .select("measured_at, weight_kg")
        .eq("member_id", s.id)
        .order("measured_at", { ascending: false })
        .limit(10);
      if (measureData) setMeasurements(measureData.reverse());
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogProgress = async (exerciseId: string, data: {
    sets_completed: number; reps_completed: string; weight_kg?: number; perceived_effort?: number;
  }) => {
    if (!session || !routine) return;
    await supabase.from("progress_logs").insert({
      member_id: session.id, routine_id: routine.id, exercise_id: exerciseId,
      ...data, logged_at: new Date().toISOString(),
    });
    setCompletedExercises(prev => new Set([...prev, exerciseId]));
    setSelectedExercise(null);
  };

  const logout = async () => {
    localStorage.removeItem("gymos_member");
    // Expire the HttpOnly session cookie server-side
    await fetch("/api/auth/member-logout", { method: "POST" });
    window.location.href = `/gym/${gymSlug}`;
  };

  if (isLoading) {
    return <GymLoader fullScreen />;
  }

  const exercises = todayDay?.routine_exercises ?? [];
  const totalMinutes = exercises.length * 6;
  const progress = exercises.length > 0 ? Math.round((completedExercises.size / exercises.length) * 100) : 0;
  const firstName = session?.name?.split(" ")[0] ?? "Atleta";
  const dateStr = arFormat(new Date(), { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-root)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "var(--font-body)",
      position: "relative",
    }}>

      {/* ── EXERCISE DETAIL OVERLAY ── */}
      {selectedExercise && selectedExercise.exercise && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSelectedExercise(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px",
          }}
        >
          <div style={{
            width: "100%", maxWidth: "560px",
            background: "var(--bg-elevated)", borderRadius: "24px 24px 0 0",
            border: "1px solid var(--border-default)", padding: "24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{
                fontSize: "11px", fontWeight: 700, color: "var(--lime)",
                background: "var(--lime-dim)", padding: "4px 10px", borderRadius: "999px",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {todayDay?.name ?? "Ejercicio"}
              </span>
              <button onClick={() => setSelectedExercise(null)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: "18px", lineHeight: 1,
              }}>✕</button>
            </div>
            <ExerciseDetail
              exercise={selectedExercise.exercise}
              sets={selectedExercise.sets}
              reps={selectedExercise.reps}
              rest_seconds={selectedExercise.rest_seconds}
              notes={selectedExercise.notes}
              onLogProgress={data => handleLogProgress(selectedExercise.exercise_id, data)}
            />
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr",
        maxWidth: "520px",
        margin: "0 auto",
        width: "100%",
        padding: "0 0 80px",  /* space for bottom nav */
      }}>

        {/* ── HOME TAB ── */}
        {activeTab === "home" && (
          <div style={{ padding: "36px 20px 24px" }}>

            {/* Greeting */}
            <div style={{ marginBottom: "28px" }}>
              <h1 style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 6vw, 36px)",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                margin: "0 0 6px",
                lineHeight: 1.15,
              }}>
                Hola, {firstName} 👋
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: 400 }}>
                  {dateStr}
                </span>
                {todayDay && (
                  <span style={{
                    fontSize: "12px", fontWeight: 700,
                    color: "var(--lime)", background: "var(--lime-dim)",
                    padding: "3px 12px", borderRadius: "999px",
                    border: "1px solid rgba(158,255,0,0.25)",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    Hoy toca: {todayDay.name ?? `Día ${todayDay.day_number}`}
                  </span>
                )}
              </div>
            </div>

            {/* No routine */}
            {!routine && (
              <div style={{
                padding: "32px 24px", borderRadius: "20px", textAlign: "center",
                background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
              }}>
                <ClipboardList size={36} color="var(--text-muted)" strokeWidth={1.5} style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-primary)", fontSize: "17px", marginBottom: "8px" }}>
                  Aún no tenés rutina
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6 }}>
                  Tu profesor está preparando tu plan personalizado. Pronto lo verás acá.
                </p>
              </div>
            )}

            {/* Rest day (routine exists but today isn't a training day) */}
            {routine && !todayDay && (
              <div style={{
                padding: "32px 24px", borderRadius: "20px", textAlign: "center",
                background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
              }}>
                <Clock size={36} color="var(--lime)" strokeWidth={1.5} style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-primary)", fontSize: "17px", marginBottom: "8px" }}>
                  Hoy es día de descanso
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6 }}>
                  Tu rutina <strong style={{ color: "var(--text-primary)" }}>{routine.name}</strong> no tiene entrenamiento para hoy. Aprovechá para recuperar.
                </p>
              </div>
            )}

            {/* Workout card */}
            {routine && todayDay && !trainingStarted && (
              <div style={{
                background: "#FFFFFF",
                borderRadius: "20px",
                padding: "24px",
                boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
              }}>
                <h2 style={{
                  fontFamily: "var(--font-display)", fontWeight: 800,
                  fontSize: "20px", color: "#0F172A",
                  letterSpacing: "-0.02em", margin: "0 0 18px",
                }}>
                  {routine.name}
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                  <InfoRow icon={<Dumbbell size={17} color="#374151" />} text={`${exercises.length} Ejercicio${exercises.length !== 1 ? "s" : ""}`} />
                  <InfoRow icon={<Clock size={17} color="#374151" />} text={`${totalMinutes} minutos aprox.`} />
                </div>

                <button
                  onClick={() => router.push(`/gym/${gymSlug}/dashboard/member/workout`)}
                  style={{
                    width: "100%", height: "52px",
                    background: "var(--lime)",
                    border: "none", borderRadius: "12px",
                    fontFamily: "var(--font-display)",
                    fontSize: "15px", fontWeight: 700,
                    color: "#000000", letterSpacing: "0.05em",
                    textTransform: "uppercase", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    boxShadow: "var(--lime-glow)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--lime-hover)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--lime)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
                >
                  <Play size={16} fill="currentColor" />
                  Empezar Entrenamiento
                </button>
              </div>
            )}

            {/* Training in progress */}
            {routine && todayDay && trainingStarted && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                {/* Progress bar */}
                <div style={{
                  background: "var(--bg-card)", borderRadius: "16px",
                  padding: "16px 20px", border: "1px solid var(--border-subtle)",
                  display: "flex", alignItems: "center", gap: "16px",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                        {todayDay.name}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--lime)" }}>
                        {progress}%
                      </span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "999px", background: "var(--bg-elevated)" }}>
                      <div style={{
                        height: "6px", borderRadius: "999px",
                        width: `${progress}%`,
                        background: "var(--lime)",
                        boxShadow: "var(--lime-glow)",
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                  <div style={{
                    width: "42px", height: "42px", borderRadius: "50%",
                    background: "var(--lime-dim)", border: "1px solid rgba(158,255,0,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "14px", color: "var(--lime)",
                  }}>
                    {completedExercises.size}/{exercises.length}
                  </div>
                </div>

                {/* Exercise list */}
                {exercises
                  .sort((a: RoutineExercise, b: RoutineExercise) => a.order_index - b.order_index)
                  .map((re: RoutineExercise, i: number) => {
                    const done = completedExercises.has(re.exercise_id);
                    return (
                      <button
                        key={re.id}
                        onClick={() => !done && setSelectedExercise(re)}
                        style={{
                          width: "100%", textAlign: "left", cursor: done ? "default" : "pointer",
                          background: done ? "rgba(158,255,0,0.06)" : "var(--bg-card)",
                          border: `1px solid ${done ? "rgba(158,255,0,0.2)" : "var(--border-subtle)"}`,
                          borderRadius: "14px", padding: "14px 16px",
                          display: "flex", alignItems: "center", gap: "14px",
                          transition: "all 0.2s", opacity: done ? 0.75 : 1,
                        }}
                        onMouseEnter={e => { if (!done) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hover)"; }}
                        onMouseLeave={e => { if (!done) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)"; }}
                      >
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                          background: done ? "var(--lime)" : "var(--bg-elevated)",
                          border: `1px solid ${done ? "transparent" : "var(--border-default)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 700, fontSize: "13px",
                          color: done ? "#000" : "var(--text-secondary)",
                        }}>
                          {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px",
                            color: done ? "var(--lime)" : "var(--text-primary)",
                            textDecoration: done ? "line-through" : "none",
                            margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {re.exercise?.name ?? "Ejercicio"}
                          </p>
                          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                            {re.sets} series × {re.reps} reps · {re.rest_seconds}s descanso
                          </p>
                        </div>
                        {re.exercise?.video_url && !done && (
                          <span style={{
                            fontSize: "11px", padding: "3px 8px", borderRadius: "999px",
                            background: "rgba(255,50,50,0.15)", color: "#FF5555", fontWeight: 600,
                          }}>▶</span>
                        )}
                        {!done && <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                      </button>
                    );
                  })}

                {/* Completed */}
                {progress === 100 && (
                  <div style={{
                    padding: "28px", borderRadius: "20px", textAlign: "center",
                    background: "rgba(46,213,115,0.08)", border: "1px solid rgba(46,213,115,0.25)",
                    marginTop: "8px",
                  }}>
                    <PartyPopper size={34} color="var(--success)" strokeWidth={1.75} style={{ margin: "0 auto 10px" }} />
                    <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--success)", fontSize: "18px", marginBottom: "6px" }}>
                      ¡Entrenamiento completado!
                    </h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      Excelente trabajo. Tu progreso fue guardado automáticamente.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── CALENDAR ── */}
            {session && (
              <div style={{ marginTop: "24px" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "18px", color: "var(--text-primary)", margin: "0 0 12px" }}>
                  Tu calendario
                </h2>
                <WorkoutCalendar memberId={session.id} />
              </div>
            )}
          </div>
        )}

        {/* ── EXERCISES TAB ── */}
        {activeTab === "exercises" && (
          <div style={{ padding: "36px 20px 24px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: "0 0 20px" }}>
              Ejercicios de hoy
            </h2>
            {exercises.length === 0 ? (
              <EmptyState icon={<Dumbbell size={34} color="var(--text-muted)" strokeWidth={1.5} />} text="No hay ejercicios asignados para hoy." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {exercises
                  .sort((a: RoutineExercise, b: RoutineExercise) => a.order_index - b.order_index)
                  .map((re: RoutineExercise, i: number) => (
                    <button
                      key={re.id}
                      onClick={() => setSelectedExercise(re)}
                      style={{
                        width: "100%", textAlign: "left", cursor: "pointer",
                        background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                        borderRadius: "14px", padding: "14px 16px",
                        display: "flex", alignItems: "center", gap: "14px",
                      }}
                    >
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                        background: "var(--lime-dim)", border: "1px solid rgba(158,255,0,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--lime)",
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "var(--text-primary)", margin: 0 }}>
                          {re.exercise?.name ?? "Ejercicio"}
                        </p>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>
                          {re.sets}×{re.reps} · {re.rest_seconds}s descanso
                        </p>
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROGRESS TAB ── */}
        {activeTab === "progress" && (
          <div style={{ padding: "36px 20px 24px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: "0 0 20px" }}>
              Tu evolución
            </h2>
            {measurements.length > 0 ? (
              <WeightChart data={measurements} />
            ) : (
              <EmptyState icon={<TrendingUp size={34} color="var(--text-muted)" strokeWidth={1.5} />} text="Aún no hay mediciones. Tu profesor las irá cargando en cada evaluación." />
            )}
            <ProgressHistory memberId={session?.id} />
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div style={{ padding: "36px 20px 24px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "24px", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: "0 0 24px" }}>
              Mi perfil
            </h2>
            <div style={{
              background: "var(--bg-card)", borderRadius: "20px", padding: "24px",
              border: "1px solid var(--border-subtle)", marginBottom: "16px",
              display: "flex", alignItems: "center", gap: "16px",
            }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%",
                background: "var(--lime-dim)", border: "1px solid rgba(158,255,0,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "22px", color: "var(--lime)",
              }}>
                {firstName[0].toUpperCase()}
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "17px", color: "var(--text-primary)", margin: 0 }}>
                  {session?.name}
                </p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                  Miembro activo
                </p>
              </div>
            </div>

            {/* Health profile link */}
            <button
              onClick={() => router.push(`/gym/${gymSlug}/dashboard/member/health-profile`)}
              style={{
                width: "100%", height: "48px",
                background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                borderRadius: "12px", cursor: "pointer",
                fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "var(--text-primary)",
                display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px",
                marginBottom: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ClipboardList size={16} color="var(--lime)" />
                Cuestionario de salud
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>

            {/* ── Apariencia (tema) ── */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "18px", marginBottom: "10px" }}>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", margin: "0 0 12px" }}>
                Apariencia
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                {([
                  { v: "dark",  l: "Oscuro",  icon: <Moon size={16} /> },
                  { v: "light", l: "Claro",   icon: <Sun size={16} /> },
                ] as const).map(opt => {
                  const active = theme === opt.v;
                  return (
                    <button
                      key={opt.v}
                      onClick={() => applyTheme(opt.v)}
                      style={{
                        flex: 1, height: "48px", borderRadius: "12px", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        border: `1.5px solid ${active ? "var(--lime)" : "var(--border-default)"}`,
                        background: active ? "var(--lime-dim)" : "var(--bg-elevated)",
                        color: active ? "var(--lime)" : "var(--text-secondary)",
                        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px",
                      }}
                    >
                      {opt.icon} {opt.l}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Feedback / sugerencias ── */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "18px", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <MessageSquare size={16} color="var(--lime)" />
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", margin: 0 }}>
                  Comentarios y sugerencias
                </p>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.5 }}>
                Contale a tu profesor qué te gustaría mejorar, dudas o ideas. Lo recibe directamente.
              </p>
              <textarea
                rows={3}
                placeholder="Escribí tu comentario..."
                className="gymos-input"
                style={{ height: "auto", resize: "none", padding: "14px 16px", lineHeight: 1.6, marginBottom: "10px" }}
                value={fbComment}
                onChange={e => setFbComment(e.target.value)}
              />
              <button
                onClick={sendFeedback}
                disabled={fbSending || !fbComment.trim()}
                className="gymos-btn gymos-btn-primary gymos-btn-full"
                style={{ height: "48px", opacity: !fbComment.trim() ? 0.5 : 1 }}
              >
                {fbSending ? <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} />
                 : fbSent  ? <><Check size={16} strokeWidth={3} /> Enviado, ¡gracias!</>
                 : <><Send size={16} /> Enviar comentario</>}
              </button>
            </div>

            <button
              onClick={logout}
              style={{
                width: "100%", height: "48px",
                background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.2)",
                borderRadius: "12px", cursor: "pointer",
                fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "var(--danger)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAVIGATION ── */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "var(--bg-glass)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        height: "76px",
      }}>
        {([
          { id: "home", icon: Home, label: "Home" },
          { id: "exercises", icon: ListChecks, label: "Ejercicios" },
          { id: "progress", icon: TrendingUp, label: "Progreso" },
          { id: "profile", icon: User, label: "Perfil" },
        ] as const).map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => id === "progress" ? router.push(`/gym/${gymSlug}/dashboard/member/progress`) : setActiveTab(id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "5px",
                background: "none", border: "none", cursor: "pointer",
                color: active ? "var(--lime)" : "var(--text-muted)",
                transition: "color 0.2s",
              }}
            >
              <Icon size={26} strokeWidth={active ? 2.5 : 1.75} />
              <span style={{ fontSize: "12px", fontWeight: active ? 700 : 500, letterSpacing: "0.02em" }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ── Shared helpers ── */

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {icon}
      <span style={{ fontSize: "15px", color: "#374151", fontWeight: 500 }}>{text}</span>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{
      padding: "40px 24px", borderRadius: "20px", textAlign: "center",
      background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
    }}>
      <div style={{ marginBottom: "12px", display: "flex", justifyContent: "center" }}>{icon}</div>
      <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

function ProgressHistory({ memberId }: { memberId?: string }) {
  const supabase = createClient();
  const [logs, setLogs] = useState<{ exercise: { name: string }; logged_at: string; weight_kg?: number; sets_completed?: number }[]>([]);

  useEffect(() => {
    if (!memberId) return;
    supabase.from("progress_logs")
      .select("logged_at, weight_kg, sets_completed, exercise:exercises(name)")
      .eq("member_id", memberId)
      .order("logged_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setLogs((data as any) ?? []));
  }, [memberId]);

  if (logs.length === 0) return (
    <div style={{ marginTop: "16px" }}>
      <EmptyState icon={<TrendingUp size={34} color="var(--text-muted)" strokeWidth={1.5} />} text="Completá tu primer entrenamiento para ver el historial." />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "16px", color: "var(--text-primary)", margin: 0 }}>
        Historial reciente
      </h3>
      {logs.map((log, i) => (
        <div key={i} style={{
          background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
          borderRadius: "14px", padding: "14px 16px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
            background: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Check size={16} color="#000" strokeWidth={3} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "var(--text-primary)", margin: 0 }}>
              {(log.exercise as any)?.name ?? "Ejercicio"}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>
              {new Date(log.logged_at).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
            </p>
          </div>
          {log.weight_kg && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--lime)", margin: 0 }}>
                {log.weight_kg}kg
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                {log.sets_completed} series
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WeightChart({ data }: { data: { measured_at: string; weight_kg?: number }[] }) {
  const weights = data.filter(d => d.weight_kg != null);
  if (weights.length === 0) return null;
  const maxW = Math.max(...weights.map(d => d.weight_kg!));
  const minW = Math.min(...weights.map(d => d.weight_kg!));
  const range = maxW - minW || 1;

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
      borderRadius: "20px", padding: "20px", marginBottom: "20px",
    }}>
      <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" }}>
        Evolución de peso (kg)
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "120px" }}>
        {weights.map((d, i) => {
          const pct = ((d.weight_kg! - minW) / range) * 65 + 35;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
              <span style={{ fontSize: "10px", color: "var(--lime)", fontWeight: 700 }}>{d.weight_kg}</span>
              <div style={{
                width: "100%", borderRadius: "6px 6px 0 0",
                height: `${pct}%`,
                background: "linear-gradient(to top, var(--lime), rgba(158,255,0,0.3))",
              }} />
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                {new Date(d.measured_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
