"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Exercise } from "@/lib/types";
import { X, Plus, Trash2, Search, Check, Loader2, Calendar } from "lucide-react";

/* ── Weekdays (ISO: 1=Mon … 7=Sun) ── */
const WEEKDAYS = [
  { n: 1, short: "Lun", long: "Lunes" },
  { n: 2, short: "Mar", long: "Martes" },
  { n: 3, short: "Mié", long: "Miércoles" },
  { n: 4, short: "Jue", long: "Jueves" },
  { n: 5, short: "Vie", long: "Viernes" },
  { n: 6, short: "Sáb", long: "Sábado" },
  { n: 7, short: "Dom", long: "Domingo" },
];

const MUSCLE_GROUPS = [
  { v: "all", l: "Todos" }, { v: "chest", l: "Pecho" }, { v: "back", l: "Espalda" },
  { v: "shoulders", l: "Hombros" }, { v: "arms", l: "Brazos" }, { v: "legs", l: "Piernas" },
  { v: "glutes", l: "Glúteos" }, { v: "core", l: "Core" }, { v: "cardio", l: "Cardio" },
  { v: "full_body", l: "Full Body" },
];

interface BuilderDay {
  id: string;
  weekday: number;       // 1-7, also stored as day_number
  name: string;
  exercises: {
    exercise_id: string;
    exercise?: Exercise;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes: string;
  }[];
}

interface Props {
  gymSlug: string;
  preselectedMember?: Profile | null;
  onClose: () => void;
  onSaved?: () => void;
}

export default function RoutineBuilder({ gymSlug, preselectedMember, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>(preselectedMember?.id ?? "");
  const [routineName, setRoutineName] = useState("");
  const [days, setDays] = useState<BuilderDay[]>([
    { id: "1", weekday: 1, name: "Tren superior", exercises: [] },
  ]);
  const [activeDay, setActiveDay] = useState(0);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("gym_id").eq("id", user.id).single();
    if (!profile) return;
    const [{ data: ms }, { data: exs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("gym_id", profile.gym_id).eq("role", "member").eq("is_active", true).order("full_name"),
      supabase.from("exercises").select("*").or(`gym_id.eq.${profile.gym_id},gym_id.is.null`).eq("is_active", true).order("name"),
    ]);
    setMembers((ms as Profile[]) ?? []);
    setExercises((exs as Exercise[]) ?? []);
  };

  const usedWeekdays = new Set(days.map(d => d.weekday));

  const addDay = () => {
    const free = WEEKDAYS.find(w => !usedWeekdays.has(w.n));
    if (!free) { setError("Ya agregaste los 7 días de la semana."); return; }
    setDays(prev => [...prev, { id: Date.now().toString(), weekday: free.n, name: "", exercises: [] }]);
    setActiveDay(days.length);
  };

  const setDayWeekday = (dayIdx: number, weekday: number) => {
    // prevent two days on the same weekday
    if (days.some((d, i) => i !== dayIdx && d.weekday === weekday)) {
      setError("Ese día de la semana ya está asignado a otro entrenamiento.");
      return;
    }
    setError(null);
    setDays(prev => prev.map((d, i) => i === dayIdx ? { ...d, weekday } : d));
  };

  const addExercise = (ex: Exercise) => {
    setDays(prev => prev.map((d, i) => i === activeDay
      ? { ...d, exercises: [...d.exercises, { exercise_id: ex.id, exercise: ex, sets: 3, reps: "10", rest_seconds: 60, notes: "" }] }
      : d));
    setShowPicker(false);
  };

  const updateExercise = (di: number, ei: number, field: string, value: string | number) => {
    setDays(prev => prev.map((d, i) => i === di
      ? { ...d, exercises: d.exercises.map((e, j) => j === ei ? { ...e, [field]: value } : e) }
      : d));
  };

  const removeExercise = (di: number, ei: number) =>
    setDays(prev => prev.map((d, i) => i === di ? { ...d, exercises: d.exercises.filter((_, j) => j !== ei) } : d));

  const removeDay = (di: number) => {
    if (days.length === 1) return;
    setDays(prev => prev.filter((_, i) => i !== di));
    setActiveDay(0);
  };

  const saveRoutine = async () => {
    if (!routineName.trim() || !selectedMember) return;
    setIsSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSaving(false); return; }
    const { data: profile } = await supabase.from("profiles").select("gym_id").eq("id", user.id).single();
    if (!profile) { setIsSaving(false); return; }

    // Deactivate previous active routines for this member
    await supabase.from("routines").update({ is_active: false })
      .eq("member_id", selectedMember).eq("is_active", true);

    // Insert new routine
    const { data: routine, error: rErr } = await supabase.from("routines").insert({
      gym_id: profile.gym_id,
      member_id: selectedMember,
      trainer_id: user.id,
      name: routineName.trim(),
      starts_at: new Date().toISOString().split("T")[0],
      is_active: true,
    }).select().single();

    if (rErr || !routine) { setError("No se pudo guardar la rutina."); setIsSaving(false); return; }

    for (const day of days) {
      const dayName = day.name.trim() || WEEKDAYS.find(w => w.n === day.weekday)?.long || `Día ${day.weekday}`;
      const { data: rDay } = await supabase.from("routine_days")
        .insert({ routine_id: routine.id, day_number: day.weekday, name: dayName })
        .select().single();
      if (rDay && day.exercises.length > 0) {
        await supabase.from("routine_exercises").insert(
          day.exercises.map((e, idx) => ({
            routine_day_id: rDay.id, exercise_id: e.exercise_id, order_index: idx,
            sets: e.sets, reps: e.reps, rest_seconds: e.rest_seconds, notes: e.notes || null,
          }))
        );
      }
    }

    setSaveSuccess(true);
    setIsSaving(false);
    setTimeout(() => { onSaved?.(); onClose(); }, 1400);
  };

  const filteredExercises = exercises.filter(e => {
    const ms = !exerciseSearch || e.name.toLowerCase().includes(exerciseSearch.toLowerCase());
    const mg = muscleFilter === "all" || e.muscle_group === muscleFilter;
    return ms && mg;
  });

  const totalExercises = days.reduce((s, d) => s + d.exercises.length, 0);

  return (
    <div style={{ fontFamily: "var(--font-display)", display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <h2 style={{ fontWeight: 800, fontSize: "20px", color: "var(--text-primary)", margin: 0 }}>
          {saveSuccess ? "Rutina guardada" : "Crear rutina"}
        </h2>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", paddingRight: "2px" }}>

        {/* Basic info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label className="gymos-label">Nombre de la rutina</label>
            <input type="text" className="gymos-input" placeholder="Ej: Hipertrofia 4 días"
              value={routineName} onChange={e => setRoutineName(e.target.value)} />
          </div>
          <div>
            <label className="gymos-label">Alumno</label>
            <select className="gymos-select" value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)} disabled={!!preselectedMember}>
              <option value="">Seleccioná un alumno</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}{m.dni ? ` (${m.dni})` : ""}</option>)}
            </select>
          </div>
        </div>

        {/* Day tabs */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <label className="gymos-label" style={{ margin: 0 }}>Días de entrenamiento ({days.length})</label>
            <button onClick={addDay} style={{ display: "flex", alignItems: "center", gap: "5px", background: "var(--lime-dim)", border: "1px solid rgba(158,255,0,0.25)", borderRadius: "8px", padding: "5px 12px", cursor: "pointer", color: "var(--lime)", fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
              <Plus size={13} /> Agregar día
            </button>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {days.map((d, i) => {
              const wd = WEEKDAYS.find(w => w.n === d.weekday);
              return (
                <button key={d.id} onClick={() => setActiveDay(i)} style={{
                  padding: "8px 14px", borderRadius: "10px", cursor: "pointer",
                  border: `1.5px solid ${activeDay === i ? "var(--lime)" : "var(--border-default)"}`,
                  background: activeDay === i ? "var(--lime-dim)" : "var(--bg-elevated)",
                  color: activeDay === i ? "var(--lime)" : "var(--text-secondary)",
                  fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)",
                }}>
                  {wd?.short} · {d.exercises.length} ej.
                </button>
              );
            })}
          </div>
        </div>

        {/* Active day editor */}
        {days[activeDay] && (
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "16px" }}>

            {/* Weekday selector */}
            <label className="gymos-label">¿Qué día de la semana entrena?</label>
            <div style={{ display: "flex", gap: "5px", marginBottom: "14px", flexWrap: "wrap" }}>
              {WEEKDAYS.map(w => {
                const active = days[activeDay].weekday === w.n;
                const taken = usedWeekdays.has(w.n) && !active;
                return (
                  <button key={w.n} onClick={() => setDayWeekday(activeDay, w.n)} disabled={taken} style={{
                    width: "42px", height: "38px", borderRadius: "9px",
                    cursor: taken ? "not-allowed" : "pointer",
                    border: `1.5px solid ${active ? "var(--lime)" : "var(--border-default)"}`,
                    background: active ? "var(--lime)" : taken ? "transparent" : "var(--bg-card)",
                    color: active ? "#000" : taken ? "var(--text-muted)" : "var(--text-secondary)",
                    fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-display)",
                    opacity: taken ? 0.4 : 1,
                  }}>
                    {w.short}
                  </button>
                );
              })}
            </div>

            {/* Day name */}
            <label className="gymos-label">Nombre del día (grupo muscular)</label>
            <input type="text" className="gymos-input" placeholder="Ej: Pecho y tríceps"
              value={days[activeDay].name}
              onChange={e => setDays(prev => prev.map((d, i) => i === activeDay ? { ...d, name: e.target.value } : d))}
              style={{ marginBottom: "14px" }} />

            {/* Exercises */}
            <label className="gymos-label">Ejercicios</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
              {days[activeDay].exercises.map((ex, ei) => (
                <div key={ei} style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{ex.exercise?.name}</span>
                    <button onClick={() => removeExercise(activeDay, ei)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", display: "flex" }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <MiniField label="Series">
                      <input type="number" min={1} max={10} value={ex.sets}
                        onChange={e => updateExercise(activeDay, ei, "sets", parseInt(e.target.value) || 1)}
                        style={miniInput} />
                    </MiniField>
                    <MiniField label="Reps">
                      <input type="text" value={ex.reps} placeholder="10-12"
                        onChange={e => updateExercise(activeDay, ei, "reps", e.target.value)}
                        style={miniInput} />
                    </MiniField>
                    <MiniField label="Descanso (s)">
                      <input type="number" min={0} step={15} value={ex.rest_seconds}
                        onChange={e => updateExercise(activeDay, ei, "rest_seconds", parseInt(e.target.value) || 0)}
                        style={miniInput} />
                    </MiniField>
                  </div>
                </div>
              ))}
              {days[activeDay].exercises.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", border: "2px dashed var(--border-default)", borderRadius: "10px" }}>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>Sin ejercicios en este día</p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowPicker(true)} style={{ flex: 1, height: "40px", borderRadius: "10px", background: "var(--bg-card)", border: "1.5px solid var(--border-default)", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-display)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Plus size={15} /> Agregar ejercicio
              </button>
              {days.length > 1 && (
                <button onClick={() => removeDay(activeDay)} style={{ height: "40px", padding: "0 14px", borderRadius: "10px", background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.25)", cursor: "pointer", color: "var(--danger)", fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-display)" }}>
                  Quitar día
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.2)" }}>
            <p style={{ fontSize: "13px", color: "var(--danger)", margin: 0 }}>{error}</p>
          </div>
        )}
      </div>

      {/* Save */}
      <button onClick={saveRoutine} disabled={isSaving || saveSuccess || !routineName.trim() || !selectedMember || totalExercises === 0}
        className="gymos-btn gymos-btn-primary gymos-btn-full"
        style={{ marginTop: "16px", height: "52px", letterSpacing: "0.04em", textTransform: "uppercase",
          opacity: (!routineName.trim() || !selectedMember || totalExercises === 0) ? 0.5 : 1 }}>
        {isSaving ? <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} />
         : saveSuccess ? <><Check size={16} strokeWidth={3} /> Guardada</>
         : <>Guardar rutina ({days.length} días · {totalExercises} ejercicios)</>}
      </button>

      {/* Exercise picker modal */}
      {showPicker && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowPicker(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "480px", maxHeight: "80vh", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Elegir ejercicio</span>
              <button onClick={() => setShowPicker(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "14px", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ position: "relative" }}>
                <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input type="text" className="gymos-input" placeholder="Buscar ejercicio..." autoFocus
                  value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)} style={{ paddingLeft: "36px", height: "44px" }} />
              </div>
              <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
                {MUSCLE_GROUPS.map(mg => (
                  <button key={mg.v} onClick={() => setMuscleFilter(mg.v)} style={{
                    flexShrink: 0, padding: "5px 12px", borderRadius: "999px",
                    border: `1px solid ${muscleFilter === mg.v ? "var(--lime)" : "var(--border-default)"}`,
                    background: muscleFilter === mg.v ? "var(--lime-dim)" : "transparent",
                    color: muscleFilter === mg.v ? "var(--lime)" : "var(--text-secondary)",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-display)",
                  }}>{mg.l}</button>
                ))}
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {filteredExercises.map(ex => (
                <button key={ex.id} onClick={() => addExercise(ex)} style={{ textAlign: "left", padding: "12px", borderRadius: "10px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", cursor: "pointer" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{ex.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {MUSCLE_GROUPS.find(m => m.v === ex.muscle_group)?.l ?? ex.muscle_group}{ex.equipment ? ` · ${ex.equipment}` : ""}
                  </div>
                </button>
              ))}
              {filteredExercises.length === 0 && <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", padding: "20px" }}>Sin resultados</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const miniInput: React.CSSProperties = {
  width: "100%", height: "34px", padding: "0 8px", textAlign: "center",
  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
  borderRadius: "7px", color: "var(--text-primary)", fontSize: "13px",
  fontFamily: "var(--font-body)", outline: "none",
};

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: "0 0 4px", fontWeight: 600, textAlign: "center" }}>{label}</p>
      {children}
    </div>
  );
}
