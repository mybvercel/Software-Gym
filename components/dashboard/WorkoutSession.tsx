"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ExerciseVideo } from "@/components/exercises/ExerciseDetail";
import {
  ChevronDown, ChevronUp,
  Check, Clock, Dumbbell, Play,
  Loader2, BarChart2, ArrowRight,
} from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import GymLoader from "@/components/ui/GymLoader";
import { arWeekday, arDateOnly } from "@/lib/datetime";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

interface Exercise {
  id: string;
  name: string;
  description?: string;
  muscle_group: string;
  equipment?: string;
  difficulty?: string;
  video_url?: string;
  thumbnail_url?: string;
  instructions?: string[];
}

interface RoutineExercise {
  id: string;
  exercise_id: string;
  exercise: Exercise;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

interface LogState {
  weight_kg: string;
  reps_done: string;
  effort: number;
  notes: string;
}

interface CompletedEntry {
  exerciseId: string;
  sets_completed: number;
  weight_kg?: number;
  reps_completed: string;
  volume: number;
}

interface MemberSession { id: string; name: string; gym_slug: string; }

/* ─────────────────────────────────────────────────────────────
   Muscle group labels (no emojis)
───────────────────────────────────────────────────────────── */

const MG_LABEL: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros",
  arms: "Brazos", legs: "Piernas", glutes: "Glúteos",
  core: "Core", cardio: "Cardio", full_body: "Full body",
};

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */

export default function WorkoutSession({ gymSlug }: { gymSlug: string }) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDayParam = searchParams.get("day"); // optional: train a specific day

  const [session, setSession]           = useState<MemberSession | null>(null);
  const [exercises, setExercises]       = useState<RoutineExercise[]>([]);
  const [dayName, setDayName]           = useState("Entrenamiento del día");
  const [routineId, setRoutineId]       = useState<string | null>(null);
  const [routineName, setRoutineName]   = useState<string>("");
  const [isLoading, setIsLoading]       = useState(true);

  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [completed, setCompleted]       = useState<Record<string, CompletedEntry>>({});
  const [savingId, setSavingId]         = useState<string | null>(null);
  const [logs, setLogs]                 = useState<Record<string, LogState>>({});
  const [setsDone, setSetsDone]         = useState<Record<string, number>>({});

  const [startTime, setStartTime]       = useState(() => Date.now());
  const [allDone, setAllDone]           = useState(false);

  // Key under which this session's progress is cached in localStorage,
  // so leaving the screen ("Volver") and coming back resumes where you left off.
  const [progressKey, setProgressKey]   = useState<string | null>(null);
  const progressKeyRef                  = useRef<string | null>(null);

  // Session feedback
  const [mood, setMood]                 = useState<string>("");
  const [comment, setComment]           = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackSaved, setFeedbackSaved]   = useState(false);
  const [autoClosed, setAutoClosed]     = useState(false);

  // Auto-close the session after 3h if the member forgot to finish it
  useEffect(() => {
    const THREE_H = 3 * 60 * 60 * 1000;
    const remaining = THREE_H - (Date.now() - startTime);
    if (remaining <= 0) return;
    const t = setTimeout(() => {
      if (feedbackSaved) return;
      const raw = localStorage.getItem("gymos_member");
      const id = raw ? (JSON.parse(raw) as MemberSession).id : "";
      if (id) markSession("end", id);
      clearSavedProgress();
      setAutoClosed(true);
      setAllDone(true);
      setFeedbackSaved(true);
    }, remaining);
    return () => clearTimeout(t);
  }, [startTime, feedbackSaved]);

  /* ── Load data ── */
  useEffect(() => {
    const raw = localStorage.getItem("gymos_member");
    if (!raw) { router.push(`/gym/${gymSlug}/login?role=member`); return; }
    try {
      const s = JSON.parse(raw) as MemberSession;
      setSession(s);
      loadWorkout(s.id);
    } catch {
      router.push(`/gym/${gymSlug}/login?role=member`);
    }
  }, [gymSlug]);

  const loadWorkout = async (memberId: string) => {
    setIsLoading(true);
    try {
      const { data: routine } = await supabase
        .from("routines")
        .select("id, name, routine_days(id, day_number, name, routine_exercises(id, exercise_id, order_index, sets, reps, rest_seconds, notes, exercise:exercises(*)))")
        .eq("member_id", memberId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!routine) { setIsLoading(false); return; }
      setRoutineName(routine.name ?? "");

      setRoutineId(routine.id);
      const days = (routine.routine_days ?? []) as any[];
      if (days.length === 0) { setIsLoading(false); return; }

      // Train a specific day if one was chosen (e.g. making up a missed day),
      // otherwise today's day by weekday (Córdoba).
      const targetDayNum = selectedDayParam ? parseInt(selectedDayParam, 10) : arWeekday();
      const sorted = [...days].sort((a, b) => a.day_number - b.day_number);
      const today = sorted.find(d => d.day_number === targetDayNum) ?? sorted[0];

      setDayName(today.name ?? `Día ${today.day_number}`);

      const exs: RoutineExercise[] = (today.routine_exercises ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index);
      setExercises(exs);

      // Default log state per exercise
      const defaultLogs: Record<string, LogState> = {};
      exs.forEach((re: RoutineExercise) => {
        defaultLogs[re.id] = { weight_kg: "", reps_done: re.reps, effort: 7, notes: "" };
      });

      // Restore any in-progress session for this same day (survives "Volver").
      const key = `gymos_workout:${memberId}:${targetDayNum}:${arDateOnly()}`;
      setProgressKey(key);
      progressKeyRef.current = key;
      let restoredLogs = defaultLogs;
      try {
        const savedRaw = localStorage.getItem(key);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw) as {
            startTime?: number;
            completed?: Record<string, CompletedEntry>;
            logs?: Record<string, LogState>;
            setsDone?: Record<string, number>;
          };
          if (saved.startTime) setStartTime(saved.startTime);
          if (saved.completed) {
            setCompleted(saved.completed);
            // Everything was already done → go straight to the finish screen.
            if (exs.length > 0 && Object.keys(saved.completed).length === exs.length) {
              setAllDone(true);
            }
          }
          if (saved.setsDone) setSetsDone(saved.setsDone);
          if (saved.logs) restoredLogs = { ...defaultLogs, ...saved.logs };
        }
      } catch { /* ignore corrupt cache */ }
      setLogs(restoredLogs);

      // Mark this member as actively training (live count for the trainer)
      if (exs.length > 0) markSession("start", memberId, today.name ?? "");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Live "training now" marker for the trainer panel ── */
  const markSession = (action: "start" | "end", memberId: string, dayLabel = "") => {
    fetch("/api/member/workout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, member_id: memberId, day_name: dayLabel || undefined }),
      keepalive: true,
    }).catch(() => {});
  };

  // Clear the live marker if the member leaves the workout screen
  useEffect(() => {
    return () => {
      const raw = localStorage.getItem("gymos_member");
      if (raw) {
        try { markSession("end", (JSON.parse(raw) as MemberSession).id); } catch {}
      }
    };
  }, []);

  /* ── Persist in-progress session to localStorage (resume after "Volver") ── */
  useEffect(() => {
    if (!progressKey || isLoading || feedbackSaved) return;
    try {
      localStorage.setItem(progressKey, JSON.stringify({ startTime, completed, logs, setsDone }));
    } catch { /* storage full / unavailable */ }
  }, [progressKey, isLoading, feedbackSaved, startTime, completed, logs, setsDone]);

  const clearSavedProgress = () => {
    const k = progressKeyRef.current;
    if (k) { try { localStorage.removeItem(k); } catch {} }
  };

  /* ── Save progress ── */
  const markDone = async (re: RoutineExercise) => {
    if (!session || !routineId) return;
    setSavingId(re.id);
    const log = logs[re.id];
    const wkg = log.weight_kg ? parseFloat(log.weight_kg) : undefined;
    const volume = wkg ? wkg * re.sets : 0;

    await supabase.from("progress_logs").insert({
      member_id: session.id,
      routine_id: routineId,
      exercise_id: re.exercise_id,
      sets_completed: re.sets,
      reps_completed: log.reps_done,
      weight_kg: wkg ?? null,
      perceived_effort: log.effort,
      notes: log.notes || null,
      logged_at: new Date().toISOString(),
    });

    const entry: CompletedEntry = {
      exerciseId: re.exercise_id,
      sets_completed: re.sets,
      weight_kg: wkg,
      reps_completed: log.reps_done,
      volume,
    };

    const next = { ...completed, [re.id]: entry };
    setCompleted(next);
    setSavingId(null);
    setExpandedId(null);

    if (Object.keys(next).length === exercises.length) {
      setTimeout(() => setAllDone(true), 400);
    }
  };

  /* ── Helpers ── */
  const doneCount  = Object.keys(completed).length;
  const totalCount = exercises.length;
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const elapsed    = Math.round((Date.now() - startTime) / 60000);
  const totalVolume= Object.values(completed).reduce((s, e) => s + e.volume, 0);

  /* ── Save session feedback (visible to the trainer) ── */
  const submitFeedback = async () => {
    if (!session) return;
    setSavingFeedback(true);
    try {
      await fetch("/api/member/session-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: session.id,
          mood: mood || null,
          comment: comment || null,
          routine_name: routineName,
          day_name: dayName,
          exercises_done: doneCount,
          total_volume_kg: Math.round(totalVolume),
          duration_min: elapsed,
        }),
      });
    } finally {
      markSession("end", session.id);   // no longer training
      clearSavedProgress();             // session finished → drop the cache
      setSavingFeedback(false);
      setFeedbackSaved(true);
    }
  };

  const MOODS = [
    { v: "great",     l: "Muy bien" },
    { v: "good",      l: "Bien" },
    { v: "normal",    l: "Normal" },
    { v: "tired",     l: "Cansado" },
    { v: "exhausted", l: "Agotado" },
  ];

  /* ──────────────── LOADING ────────────────────────────── */
  if (isLoading) return <GymLoader fullScreen />;

  /* ──────────────── COMPLETION SCREEN ─────────────────── */
  if (allDone) return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-root)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 20px 60px", fontFamily: "var(--font-body)",
    }}>
      <div style={{ width: "100%", maxWidth: "440px", display: "flex", flexDirection: "column", alignItems: "center" }}>

        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          background: "var(--lime-dim)", border: "2px solid var(--lime)",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px",
        }}>
          <Check size={36} color="var(--lime)" strokeWidth={2.5} />
        </div>

        {!feedbackSaved ? (
          <>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(24px,6vw,30px)", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: "0 0 8px", textAlign: "center" }}>
              ¡Terminaste todo por hoy!
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "15px", margin: "0 0 28px", textAlign: "center" }}>
              Tu progreso quedó guardado.
            </p>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", width: "100%", marginBottom: "28px" }}>
              {[
                { icon: <Check size={18} />, value: `${doneCount}`, label: "Ejercicios" },
                { icon: <Clock size={18} />, value: `${elapsed}m`, label: "Duración" },
                { icon: <BarChart2 size={18} />, value: `${Math.round(totalVolume)}kg`, label: "Volumen" },
              ].map(({ icon, value, label }) => (
                <div key={label} style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "16px 8px", textAlign: "center" }}>
                  <div style={{ color: "var(--lime)", display: "flex", justifyContent: "center", marginBottom: "6px" }}>{icon}</div>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "20px", color: "var(--text-primary)", margin: "0 0 2px" }}>{value}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Mood selector */}
            <div style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "20px", marginBottom: "16px" }}>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "16px", color: "var(--text-primary)", margin: "0 0 14px" }}>
                ¿Cómo te sentiste hoy?
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                {MOODS.map(m => {
                  const active = mood === m.v;
                  return (
                    <button key={m.v} onClick={() => setMood(active ? "" : m.v)} style={{
                      padding: "10px 16px", borderRadius: "999px", cursor: "pointer",
                      border: `1.5px solid ${active ? "var(--lime)" : "var(--border-default)"}`,
                      background: active ? "var(--lime-dim)" : "var(--bg-elevated)",
                      color: active ? "var(--lime)" : "var(--text-secondary)",
                      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px",
                    }}>
                      {m.l}
                    </button>
                  );
                })}
              </div>

              <label className="gymos-label">Comentario para tu profe (opcional)</label>
              <textarea
                rows={3}
                placeholder="Ej: las sentadillas me costaron, el peso del press estuvo perfecto..."
                className="gymos-input"
                style={{ height: "auto", resize: "none", padding: "14px 16px", lineHeight: 1.6 }}
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
            </div>

            <button
              onClick={submitFeedback}
              disabled={savingFeedback}
              className="gymos-btn gymos-btn-primary gymos-btn-full"
              style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}
            >
              {savingFeedback ? <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} /> : <>Guardar y finalizar <ArrowRight size={16} /></>}
            </button>
          </>
        ) : (
          /* ── Farewell ── */
          <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(24px,6vw,30px)", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
              {autoClosed ? "Entrenamiento cerrado" : "¡A descansar!"}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "16px", lineHeight: 1.6, margin: "0 0 8px" }}>
              {autoClosed
                ? "Cerramos tu entrenamiento automáticamente porque pasaron 3 horas. ¡Nos vemos en la próxima!"
                : "Te espero en la próxima sesión."}
            </p>
            {!autoClosed && (mood || comment) ? (
              <p style={{ color: "var(--lime)", fontSize: "14px", fontWeight: 600, margin: "0 0 32px" }}>
                Tu profe va a ver cómo te sentiste hoy.
              </p>
            ) : <div style={{ height: "32px" }} />}

            <button
              onClick={() => router.push(`/gym/${gymSlug}/dashboard/member`)}
              className="gymos-btn gymos-btn-primary"
              style={{ letterSpacing: "0.04em", textTransform: "uppercase", minWidth: "220px" }}
            >
              Volver al inicio <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  /* ──────────────── EMPTY STATE ────────────────────────── */
  if (exercises.length === 0) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-root)", display: "flex", flexDirection: "column", fontFamily: "var(--font-body)" }}>
      <TopBar gymSlug={gymSlug} dayName={dayName} doneCount={0} totalCount={0} pct={0} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
        <Dumbbell size={40} color="var(--text-muted)" strokeWidth={1.5} style={{ marginBottom: "16px" }} />
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "20px", color: "var(--text-primary)", margin: "0 0 8px" }}>
          Sin ejercicios asignados
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Tu profesor todavía no asignó ejercicios para hoy.
        </p>
      </div>
    </div>
  );

  /* ──────────────── MAIN RENDER ────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-root)", display: "flex", flexDirection: "column", fontFamily: "var(--font-body)" }}>

      <TopBar gymSlug={gymSlug} dayName={dayName} doneCount={doneCount} totalCount={totalCount} pct={pct} />

      <main style={{ flex: 1, maxWidth: "600px", width: "100%", margin: "0 auto", padding: "20px 16px 40px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {exercises.map((re, idx) => {
            const isDone    = !!completed[re.id];
            const isExpanded = expandedId === re.id;
            const log        = logs[re.id] ?? { weight_kg: "", reps_done: re.reps, effort: 7, notes: "" };

            return (
              <ExerciseAccordion
                key={re.id}
                re={re}
                idx={idx}
                isDone={isDone}
                isExpanded={isExpanded}
                isSaving={savingId === re.id}
                log={log}
                setsDone={setsDone[re.id] ?? 0}
                onSetsDoneChange={(n) => setSetsDone(prev => ({ ...prev, [re.id]: n }))}
                onToggle={() => setExpandedId(isExpanded ? null : re.id)}
                onLogChange={(patch) => setLogs(prev => ({ ...prev, [re.id]: { ...prev[re.id], ...patch } }))}
                onMarkDone={() => markDone(re)}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TopBar — sticky header with progress
───────────────────────────────────────────────────────────── */

function TopBar({ gymSlug, dayName, doneCount, totalCount, pct }: {
  gymSlug: string; dayName: string; doneCount: number; totalCount: number; pct: number;
}) {
  const router = useRouter();
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 40,
      background: "var(--bg-elevated)",
      borderBottom: "1px solid var(--border-subtle)",
      padding: "16px 20px 14px",
    }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <BackButton onClick={() => router.push(`/gym/${gymSlug}/dashboard/member`)} tone="dark" />
          <span style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "18px", color: "var(--text-primary)",
          }}>
            {dayName}
          </span>
          <span style={{
            fontSize: "13px", fontWeight: 600,
            color: "var(--lime)", fontFamily: "var(--font-display)",
          }}>
            {doneCount}/{totalCount}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: "5px", borderRadius: "999px", background: "var(--border-subtle)" }}>
          <div style={{
            height: "5px", borderRadius: "999px",
            width: `${pct}%`,
            background: "var(--lime)",
            boxShadow: pct > 0 ? "var(--lime-glow)" : "none",
            transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
          }} />
        </div>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "6px 0 0", fontWeight: 500 }}>
          {pct}% completado
        </p>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   ExerciseAccordion — one card per exercise
───────────────────────────────────────────────────────────── */

function ExerciseAccordion({ re, idx, isDone, isExpanded, isSaving, log, setsDone, onSetsDoneChange, onToggle, onLogChange, onMarkDone }: {
  re: RoutineExercise;
  idx: number;
  isDone: boolean;
  isExpanded: boolean;
  isSaving: boolean;
  log: LogState;
  setsDone: number;
  onSetsDoneChange: (n: number) => void;
  onToggle: () => void;
  onLogChange: (patch: Partial<LogState>) => void;
  onMarkDone: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const ex = re.exercise;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: `1px solid ${isDone ? "rgba(158,255,0,0.2)" : isExpanded ? "var(--border-hover)" : "var(--border-subtle)"}`,
      borderRadius: "16px",
      overflow: "hidden",
      transition: "border-color 0.2s",
      opacity: isDone ? 0.75 : 1,
    }}>

      {/* ── Card header — always visible ── */}
      <button
        onClick={onToggle}
        disabled={isDone}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "14px",
          padding: "14px 16px", background: "none", border: "none",
          cursor: isDone ? "default" : "pointer", textAlign: "left",
        }}
      >
        {/* Number / check badge */}
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
          background: isDone ? "var(--lime)" : "var(--bg-elevated)",
          border: `1px solid ${isDone ? "transparent" : "var(--border-default)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isDone
            ? <Check size={16} color="#000" strokeWidth={3} />
            : <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13px", color: "var(--text-secondary)" }}>{idx + 1}</span>
          }
        </div>

        {/* Thumbnail */}
        <Thumbnail ex={ex} />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "16px",
            color: isDone ? "var(--lime)" : "var(--text-primary)",
            textDecoration: isDone ? "line-through" : "none",
            margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {ex.name}
          </p>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "3px 0 0" }}>
            {re.sets} series × {re.reps} reps
          </p>
          <p style={{ fontSize: "13px", color: "var(--lime)", margin: "2px 0 0", fontWeight: 600 }}>
            {re.rest_seconds}s descanso
          </p>
        </div>

        {/* Play pill (only if video) */}
        {ex.video_url && !isDone && (
          <div style={{
            display: "flex", alignItems: "center", gap: "4px",
            padding: "4px 10px", borderRadius: "999px",
            background: "rgba(255,50,50,0.12)", border: "1px solid rgba(255,50,50,0.2)",
            flexShrink: 0,
          }}>
            <Play size={11} fill="#FF5555" color="#FF5555" />
            <span style={{ fontSize: "11px", color: "#FF5555", fontWeight: 700 }}>Video</span>
          </div>
        )}

        {/* Chevron */}
        {!isDone && (
          <div style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </button>

      {/* ── Expanded body ── */}
      {isExpanded && !isDone && (
        <div
          ref={bodyRef}
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "20px 16px 24px",
            display: "flex", flexDirection: "column", gap: "20px",
          }}
        >
          {/* Prescription strip */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)",
            background: "var(--bg-elevated)", borderRadius: "12px",
            border: "1px solid var(--border-subtle)", overflow: "hidden",
          }}>
            {[
              { label: "Series", value: re.sets },
              { label: "Reps", value: re.reps },
              { label: "Descanso", value: `${re.rest_seconds}s` },
            ].map(({ label, value }, i) => (
              <div key={label} style={{
                textAlign: "center", padding: "12px 8px",
                borderRight: i < 2 ? "1px solid var(--border-subtle)" : "none",
              }}>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "20px", color: "var(--lime)", margin: 0 }}>
                  {value}
                </p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "3px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Set tracker with rest timer */}
          <SetTracker sets={re.sets} restSeconds={re.rest_seconds} done={setsDone} onDoneChange={onSetsDoneChange} />

          {/* Video / photo — photo shows instantly, video loads on tap */}
          {(ex.video_url || ex.thumbnail_url) ? (
            <ExerciseVideo videoUrl={ex.video_url} exerciseName={ex.name} posterUrl={ex.thumbnail_url} />
          ) : (
            <div style={{
              width: "100%", aspectRatio: "16/9",
              background: "var(--bg-elevated)", borderRadius: "12px",
              border: "1px solid var(--border-subtle)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "8px",
            }}>
              <Play size={28} color="var(--text-muted)" strokeWidth={1.5} />
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                Video no disponible aún
              </p>
            </div>
          )}

          {/* Instructions */}
          {ex.instructions && ex.instructions.length > 0 && (
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
                Ejecución
              </p>
              <ol style={{ display: "flex", flexDirection: "column", gap: "8px", padding: 0, margin: 0, listStyle: "none" }}>
                {ex.instructions.map((step, i) => (
                  <li key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span style={{
                      width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                      background: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "11px", color: "#000",
                      marginTop: "1px",
                    }}>{i + 1}</span>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Trainer notes */}
          {re.notes && (
            <div style={{
              padding: "12px 14px", borderRadius: "10px",
              background: "rgba(255,184,0,0.06)", border: "1px solid rgba(255,184,0,0.18)",
            }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,184,0,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
                Nota del profe
              </p>
              <p style={{ fontSize: "13px", color: "rgba(255,220,100,0.9)", margin: 0, lineHeight: 1.6 }}>
                {re.notes}
              </p>
            </div>
          )}

          {/* Log form */}
          <LogForm log={log} sets={re.sets} onChange={onLogChange} onSave={onMarkDone} isSaving={isSaving} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SetTracker — one circle per set + auto rest countdown
───────────────────────────────────────────────────────────── */

function SetTracker({ sets, restSeconds, done, onDoneChange }: {
  sets: number; restSeconds: number; done: number; onDoneChange: (n: number) => void;
}) {
  const [rest, setRest] = useState(0);          // remaining rest seconds
  const [resting, setResting] = useState(false);

  // Countdown tick
  useEffect(() => {
    if (!resting) return;
    if (rest <= 0) { setResting(false); return; }
    const t = setTimeout(() => setRest(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, rest]);

  const tapSet = (i: number) => {
    if (i < done) {
      // un-mark this set and the ones after it
      onDoneChange(i);
      setResting(false);
      setRest(0);
    } else {
      // complete up to this set → start rest
      onDoneChange(i + 1);
      setRest(restSeconds);
      setResting(restSeconds > 0);
    }
  };

  const skipRest = () => { setResting(false); setRest(0); };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const allDone = done >= sets;
  const restPct = restSeconds > 0 ? (rest / restSeconds) * 100 : 0;

  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
      borderRadius: "12px", padding: "16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
          Series completadas
        </span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "15px", color: allDone ? "var(--lime)" : "var(--text-secondary)" }}>
          {done}/{sets}
        </span>
      </div>

      {/* Circles — one per set */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {Array.from({ length: sets }).map((_, i) => {
          const filled = i < done;
          return (
            <button
              key={i}
              onClick={() => tapSet(i)}
              aria-label={`Serie ${i + 1}`}
              style={{
                width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                cursor: "pointer", padding: 0,
                background: filled ? "var(--lime)" : "transparent",
                border: `2px solid ${filled ? "var(--lime)" : "var(--border-hover)"}`,
                color: filled ? "#000" : "var(--text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13px",
                transition: "all 0.15s",
                boxShadow: filled ? "0 0 10px rgba(158,255,0,0.35)" : "none",
              }}
            >
              {filled ? <Check size={16} strokeWidth={3} /> : i + 1}
            </button>
          );
        })}
      </div>

      {/* Rest countdown */}
      {resting && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} color="var(--lime)" />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "22px", color: "var(--lime)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {fmt(rest)}
              </span>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>descanso</span>
            </div>
            <button onClick={skipRest} style={{
              background: "var(--bg-card)", border: "1px solid var(--border-default)",
              borderRadius: "8px", padding: "6px 12px", cursor: "pointer",
              fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "13px", color: "var(--text-secondary)",
            }}>
              Saltar
            </button>
          </div>
          <div style={{ height: "6px", borderRadius: "999px", background: "var(--bg-card)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${restPct}%`, background: "var(--lime)", borderRadius: "999px", transition: "width 1s linear" }} />
          </div>
        </div>
      )}

      {/* Finished resting / all done hints */}
      {!resting && done > 0 && !allDone && (
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "12px 0 0", fontWeight: 500 }}>
          Descanso terminado. ¡A la siguiente serie!
        </p>
      )}
      {allDone && (
        <p style={{ fontSize: "13px", color: "var(--lime)", margin: "12px 0 0", fontWeight: 700 }}>
          Completaste las {sets} series. Registrá tu peso abajo y marcá el ejercicio.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Thumbnail — image or styled placeholder
───────────────────────────────────────────────────────────── */

function Thumbnail({ ex }: { ex: Exercise }) {
  if (ex.thumbnail_url) {
    return (
      <img
        src={ex.thumbnail_url}
        alt={ex.name}
        style={{ width: "48px", height: "48px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  const label = MG_LABEL[ex.muscle_group] ?? ex.muscle_group;
  const initial = label.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: "48px", height: "48px", borderRadius: "10px", flexShrink: 0,
      background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
    }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "13px", color: "var(--lime)", lineHeight: 1 }}>
        {initial}
      </span>
      <Dumbbell size={10} color="var(--text-muted)" strokeWidth={1.5} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LogForm — weight, reps, effort slider, notes
───────────────────────────────────────────────────────────── */

function LogForm({ log, sets, onChange, onSave, isSaving }: {
  log: LogState;
  sets: number;
  onChange: (p: Partial<LogState>) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div style={{
      background: "var(--bg-elevated)", borderRadius: "14px",
      border: "1px solid var(--border-subtle)", padding: "18px",
      display: "flex", flexDirection: "column", gap: "16px",
    }}>
      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)", margin: 0 }}>
        Registrar serie
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {/* Peso */}
        <div>
          <label className="gymos-label">Peso (kg)</label>
          <input
            type="number" min="0" step="0.5"
            placeholder="0"
            className="gymos-input"
            style={{ height: "44px" }}
            value={log.weight_kg}
            onChange={e => onChange({ weight_kg: e.target.value })}
          />
        </div>
        {/* Reps por serie */}
        <div>
          <label className="gymos-label">Reps por serie</label>
          <input
            type="text"
            placeholder={`${Array(sets).fill("10").join(", ")}`}
            className="gymos-input"
            style={{ height: "44px" }}
            value={log.reps_done}
            onChange={e => onChange({ reps_done: e.target.value })}
          />
        </div>
      </div>

      {/* Esfuerzo */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <label className="gymos-label" style={{ margin: 0 }}>Esfuerzo percibido</label>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px", color: effortColor(log.effort) }}>
            {log.effort}/10
          </span>
        </div>
        <input
          type="range" min="1" max="10"
          value={log.effort}
          onChange={e => onChange({ effort: Number(e.target.value) })}
          style={{ width: "100%", accentColor: effortColor(log.effort) }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Muy fácil</span>
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Al límite</span>
        </div>
      </div>

      {/* Notas opcionales */}
      <div>
        <label className="gymos-label">Notas (opcional)</label>
        <textarea
          rows={2}
          placeholder="Ej: aumentar peso la próxima vez..."
          className="gymos-input"
          style={{ height: "auto", resize: "none", padding: "10px 14px", fontSize: "13px", lineHeight: "1.5" }}
          value={log.notes}
          onChange={e => onChange({ notes: e.target.value })}
        />
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className="gymos-btn gymos-btn-primary gymos-btn-full"
        style={{ letterSpacing: "0.04em", textTransform: "uppercase", opacity: isSaving ? 0.6 : 1 }}
      >
        {isSaving
          ? <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} />
          : <><Check size={16} strokeWidth={3} /> Marcar como completado</>
        }
      </button>
    </div>
  );
}

function effortColor(n: number): string {
  if (n <= 3) return "var(--success)";
  if (n <= 6) return "var(--lime)";
  if (n <= 8) return "var(--warning)";
  return "var(--danger)";
}
