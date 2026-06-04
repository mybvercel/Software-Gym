"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Exercise } from "@/lib/types";
import { getInitials } from "@/lib/utils";

interface RoutineDay {
  id: string;
  day_number: number;
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
}

export default function RoutineBuilder({ gymSlug, preselectedMember, onClose }: Props) {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>(preselectedMember?.id ?? "");
  const [routineName, setRoutineName] = useState("");
  const [days, setDays] = useState<RoutineDay[]>([
    { id: "1", day_number: 1, name: "Día A", exercises: [] },
  ]);
  const [activeDay, setActiveDay] = useState(0);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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

  const addDay = () => {
    const newDay: RoutineDay = {
      id: Date.now().toString(),
      day_number: days.length + 1,
      name: `Día ${String.fromCharCode(65 + days.length)}`,
      exercises: [],
    };
    setDays((prev) => [...prev, newDay]);
    setActiveDay(days.length);
  };

  const addExercise = (exercise: Exercise) => {
    setDays((prev) => prev.map((d, i) =>
      i === activeDay
        ? { ...d, exercises: [...d.exercises, { exercise_id: exercise.id, exercise, sets: 3, reps: "10", rest_seconds: 60, notes: "" }] }
        : d
    ));
    setShowExercisePicker(false);
  };

  const updateExercise = (dayIndex: number, exIndex: number, field: string, value: string | number) => {
    setDays((prev) => prev.map((d, i) =>
      i === dayIndex
        ? {
            ...d, exercises: d.exercises.map((e, j) =>
              j === exIndex ? { ...e, [field]: value } : e
            )
          }
        : d
    ));
  };

  const removeExercise = (dayIndex: number, exIndex: number) => {
    setDays((prev) => prev.map((d, i) =>
      i === dayIndex ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIndex) } : d
    ));
  };

  const saveRoutine = async () => {
    if (!routineName.trim() || !selectedMember) return;
    setIsSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSaving(false); return; }

    const { data: profile } = await supabase.from("profiles").select("gym_id").eq("id", user.id).single();
    if (!profile) { setIsSaving(false); return; }

    // 1. Insert routine
    const { data: routine, error: rErr } = await supabase
      .from("routines")
      .insert({
        gym_id: profile.gym_id,
        member_id: selectedMember,
        trainer_id: user.id,
        name: routineName.trim(),
        starts_at: new Date().toISOString().split("T")[0],
        is_active: true,
      })
      .select()
      .single();

    if (rErr || !routine) { setIsSaving(false); return; }

    // 2. Insert days + exercises
    for (const day of days) {
      const { data: rDay } = await supabase
        .from("routine_days")
        .insert({ routine_id: routine.id, day_number: day.day_number, name: day.name })
        .select()
        .single();

      if (rDay && day.exercises.length > 0) {
        await supabase.from("routine_exercises").insert(
          day.exercises.map((e, idx) => ({
            routine_day_id: rDay.id,
            exercise_id: e.exercise_id,
            order_index: idx,
            sets: e.sets,
            reps: e.reps,
            rest_seconds: e.rest_seconds,
            notes: e.notes || null,
          }))
        );
      }
    }

    setSaveSuccess(true);
    setTimeout(() => { setSaveSuccess(false); onClose(); }, 2000);
    setIsSaving(false);
  };

  const filteredExercises = exercises.filter((e) => {
    const matchSearch = !exerciseSearch || e.name.toLowerCase().includes(exerciseSearch.toLowerCase());
    const matchMuscle = muscleFilter === "all" || e.muscle_group === muscleFilter;
    return matchSearch && matchMuscle;
  });

  const MUSCLE_GROUPS = ["chest", "back", "shoulders", "arms", "legs", "glutes", "core", "cardio", "full_body"];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          {saveSuccess ? "✅ ¡Rutina guardada!" : "Nueva Rutina"}
        </h1>
        <button onClick={onClose} className="btn btn-ghost btn-sm" id="close-routine-builder">
          ✕ Cancelar
        </button>
      </div>

      {/* Step 1: Basic Info */}
      <div
        className="p-5 rounded-2xl space-y-4"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Información general
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Nombre de la rutina</label>
            <input
              type="text"
              placeholder="Ej: Hipertrofia Full Body 4x"
              className="form-input"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              id="routine-name-input"
            />
          </div>
          <div>
            <label className="form-label">Alumno</label>
            <select
              className="form-select"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              id="routine-member-select"
              disabled={!!preselectedMember}
            >
              <option value="">Seleccioná un alumno</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} {m.dni ? `(DNI ${m.dni})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Days */}
      <div
        className="p-5 rounded-2xl space-y-4"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Días de entrenamiento
          </h2>
          <button onClick={addDay} className="btn btn-secondary btn-sm" id="add-day-btn">
            + Agregar día
          </button>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2 flex-wrap">
          {days.map((day, i) => (
            <button
              key={day.id}
              onClick={() => setActiveDay(i)}
              id={`day-tab-${i}`}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeDay === i ? "var(--color-primary)" : "var(--bg-glass-light)",
                color: activeDay === i ? "#000" : "var(--text-secondary)",
                border: `1px solid ${activeDay === i ? "transparent" : "var(--border-subtle)"}`,
              }}
            >
              {day.name} ({day.exercises.length} ej.)
            </button>
          ))}
        </div>

        {/* Day name edit */}
        <input
          type="text"
          className="form-input"
          value={days[activeDay]?.name ?? ""}
          onChange={(e) => setDays((prev) => prev.map((d, i) => i === activeDay ? { ...d, name: e.target.value } : d))}
          placeholder="Nombre del día (ej: Lunes - Empuje)"
          id={`day-name-${activeDay}`}
        />

        {/* Exercises in this day */}
        <div className="space-y-2">
          {days[activeDay]?.exercises.map((ex, exIdx) => (
            <div
              key={exIdx}
              className="p-3 rounded-xl flex items-center gap-3"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  {ex.exercise?.name ?? "Ejercicio"}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number" min={1} max={10}
                    className="form-input text-xs text-center"
                    style={{ width: 60, padding: "0.3rem 0.5rem" }}
                    value={ex.sets}
                    onChange={(e) => updateExercise(activeDay, exIdx, "sets", parseInt(e.target.value))}
                    title="Series"
                  />
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>series ×</span>
                  <input
                    type="text"
                    className="form-input text-xs text-center"
                    style={{ width: 70, padding: "0.3rem 0.5rem" }}
                    value={ex.reps}
                    onChange={(e) => updateExercise(activeDay, exIdx, "reps", e.target.value)}
                    placeholder="10-12"
                    title="Repeticiones"
                  />
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>reps —</span>
                  <input
                    type="number" min={15} step={15}
                    className="form-input text-xs text-center"
                    style={{ width: 70, padding: "0.3rem 0.5rem" }}
                    value={ex.rest_seconds}
                    onChange={(e) => updateExercise(activeDay, exIdx, "rest_seconds", parseInt(e.target.value))}
                    title="Descanso (segundos)"
                  />
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>s descanso</span>
                </div>
              </div>
              <button
                onClick={() => removeExercise(activeDay, exIdx)}
                className="btn btn-danger btn-sm"
                id={`remove-ex-${exIdx}`}
              >
                ✕
              </button>
            </div>
          ))}

          {(days[activeDay]?.exercises.length === 0) && (
            <div
              className="p-6 text-center rounded-xl"
              style={{ border: "2px dashed var(--border-default)" }}
            >
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.9rem" }}>
                Agregá ejercicios a este día
              </p>
            </div>
          )}

          <button
            onClick={() => setShowExercisePicker(true)}
            className="btn btn-secondary btn-full"
            id="add-exercise-btn"
          >
            + Agregar ejercicio
          </button>
        </div>
      </div>

      {/* Exercise picker modal */}
      {showExercisePicker && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowExercisePicker(false); }}
        >
          <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
            <div
              className="w-full max-w-lg rounded-2xl overflow-hidden animate-fade-in-up"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
            >
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <h3 className="font-bold" style={{ fontFamily: "var(--font-display)" }}>Elegir Ejercicio</h3>
                <button onClick={() => setShowExercisePicker(false)} className="btn btn-ghost btn-sm" id="close-exercise-picker">✕</button>
              </div>
              <div className="p-4 space-y-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <input
                  type="text"
                  placeholder="Buscar ejercicio..."
                  className="form-input"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  autoFocus
                  id="exercise-search"
                />
                <select className="form-select" value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)} id="muscle-filter">
                  <option value="all">Todos los músculos</option>
                  {MUSCLE_GROUPS.map((mg) => <option key={mg} value={mg}>{mg}</option>)}
                </select>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {filteredExercises.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    id={`pick-exercise-${ex.id}`}
                    className="w-full text-left p-3 rounded-xl transition-all hover:border-[var(--color-primary)]"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
                  >
                    <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>{ex.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {ex.muscle_group} • {ex.equipment ?? "Sin equipamiento"} • {ex.difficulty ?? ""}
                    </div>
                  </button>
                ))}
                {filteredExercises.length === 0 && (
                  <p className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>No se encontraron ejercicios.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <button
        onClick={saveRoutine}
        disabled={isSaving || !routineName.trim() || !selectedMember}
        className="btn btn-primary btn-full btn-lg"
        id="save-routine-btn"
      >
        {isSaving ? <><span className="loading-spinner" /> Guardando...</> : "💾 Guardar Rutina"}
      </button>
    </div>
  );
}
