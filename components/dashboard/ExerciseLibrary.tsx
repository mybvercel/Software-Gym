"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/types";
import { ExerciseVideo } from "@/components/exercises/ExerciseDetail";
import {
  Search, Plus, X, Play, ChevronRight,
  Loader2, Check, Dumbbell, Filter,
} from "lucide-react";

/* ─────────────────────── Design tokens (trainer — light) ── */
const T = {
  green: "#22C55E", greenDim: "rgba(34,197,94,0.10)", greenBorder: "rgba(34,197,94,0.28)",
  bg: "#F1F5F9", card: "#FFFFFF", border: "#E2E8F0",
  text: "#0F172A", muted: "#64748B", light: "#94A3B8",
  red: "#EF4444", orange: "#F97316",
  font: "'Space Grotesk', system-ui, sans-serif",
  navy: "#0D1B2A",
};

/* ─────────────────────── Constants ── */

const MUSCLE_GROUPS = [
  { value: "all",       label: "Todos" },
  { value: "chest",     label: "Pecho" },
  { value: "back",      label: "Espalda" },
  { value: "shoulders", label: "Hombros" },
  { value: "arms",      label: "Brazos" },
  { value: "legs",      label: "Piernas" },
  { value: "glutes",    label: "Glúteos" },
  { value: "core",      label: "Core" },
  { value: "cardio",    label: "Cardio" },
  { value: "full_body", label: "Full Body" },
] as const;

const MUSCLE_COLORS: Record<string, { bg: string; text: string }> = {
  chest:     { bg: "#FEE2E2", text: "#DC2626" },
  back:      { bg: "#DBEAFE", text: "#2563EB" },
  shoulders: { bg: "#EDE9FE", text: "#7C3AED" },
  arms:      { bg: "#FCE7F3", text: "#DB2777" },
  legs:      { bg: "#D1FAE5", text: "#059669" },
  glutes:    { bg: "#FEF3C7", text: "#D97706" },
  core:      { bg: "#FFEDD5", text: "#EA580C" },
  cardio:    { bg: "#E0F2FE", text: "#0284C7" },
  full_body: { bg: "#F3F4F6", text: "#374151" },
};

const MUSCLE_LABELS: Record<string, string> = {
  chest:"Pecho", back:"Espalda", shoulders:"Hombros", arms:"Brazos",
  legs:"Piernas", glutes:"Glúteos", core:"Core", cardio:"Cardio", full_body:"Full Body",
};

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  beginner:     { label: "Principiante", color: "#16A34A", bg: "#D1FAE5" },
  intermediate: { label: "Intermedio",   color: "#D97706", bg: "#FEF3C7" },
  advanced:     { label: "Avanzado",     color: "#DC2626", bg: "#FEE2E2" },
};

const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: "Barra", dumbbell: "Mancuerna", machine: "Máquina",
  cable: "Cable", bodyweight: "Peso corporal", bands: "Bandas",
  kettlebell: "Kettlebell", other: "Otro",
};

/* ─────────────────────── Component ── */

interface Props { gymSlug: string }

export default function ExerciseLibrary({ gymSlug }: Props) {
  const supabase = createClient();

  const [exercises,   setExercises]   = useState<Exercise[]>([]);
  const [search,      setSearch]      = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [diffFilter,  setDiffFilter]  = useState("all");
  const [selected,    setSelected]    = useState<Exercise | null>(null);
  const [showForm,    setShowForm]    = useState(false);
  const [isLoading,   setIsLoading]   = useState(true);
  const [gymId,       setGymId]       = useState<string | null>(null);
  const [isSaving,    setIsSaving]    = useState(false);
  const [saveOk,      setSaveOk]      = useState(false);

  const [newEx, setNewEx] = useState({
    name: "", muscle_group: "chest", description: "",
    video_url: "", equipment: "barbell", difficulty: "beginner",
  });

  useEffect(() => { loadExercises(); }, []);

  const loadExercises = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase.from("exercises").select("*").eq("is_active", true).order("name");

    if (user) {
      const { data: profile } = await supabase.from("profiles").select("gym_id").eq("id", user.id).single();
      if (profile?.gym_id) {
        setGymId(profile.gym_id);
        query = query.or(`gym_id.eq.${profile.gym_id},gym_id.is.null`);
      }
    }

    const { data } = await query;
    setExercises((data as Exercise[]) ?? []);
    setIsLoading(false);
  };

  const saveExercise = async () => {
    if (!newEx.name.trim()) return;
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data } = await supabase.from("exercises").insert({
      gym_id: gymId ?? null,
      name: newEx.name.trim(),
      muscle_group: newEx.muscle_group,
      description: newEx.description || null,
      video_url: newEx.video_url || null,
      equipment: newEx.equipment || null,
      difficulty: newEx.difficulty,
      is_active: true,
      created_by: user?.id ?? null,
    }).select().single();

    if (data) {
      setExercises(prev => [...prev, data as Exercise].sort((a, b) => a.name.localeCompare(b.name)));
      setSaveOk(true);
      setTimeout(() => {
        setSaveOk(false);
        setShowForm(false);
        setNewEx({ name: "", muscle_group: "chest", description: "", video_url: "", equipment: "barbell", difficulty: "beginner" });
      }, 1200);
    }
    setIsSaving(false);
  };

  const filtered = exercises.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = muscleFilter === "all" || e.muscle_group === muscleFilter;
    const matchDiff   = diffFilter   === "all" || e.difficulty   === diffFilter;
    return matchSearch && matchMuscle && matchDiff;
  });

  /* ── RENDER ── */
  return (
    <div style={{ fontFamily: T.font, minHeight: "100%" }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontFamily: T.font, fontWeight: 800, fontSize: "20px", color: T.card, margin: "0 0 2px", letterSpacing: "-0.01em" }}>
              Ejercicios
            </h2>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", margin: 0 }}>
              {filtered.length} ejercicios disponibles
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 16px", borderRadius: "10px",
              background: T.green, border: "none", cursor: "pointer",
              fontFamily: T.font, fontWeight: 700, fontSize: "13px", color: "#fff",
            }}
          >
            <Plus size={15} /> Nuevo
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "12px" }}>
          <Search size={15} color="rgba(255,255,255,0.35)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", height: "42px", paddingLeft: "36px", paddingRight: "14px",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "10px", color: "#fff", fontSize: "14px", fontFamily: T.font,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Muscle filter pills */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
          {MUSCLE_GROUPS.map(mg => {
            const active = muscleFilter === mg.value;
            return (
              <button
                key={mg.value}
                onClick={() => setMuscleFilter(mg.value)}
                style={{
                  flexShrink: 0, padding: "5px 12px", borderRadius: "999px",
                  border: `1px solid ${active ? T.green : "rgba(255,255,255,0.12)"}`,
                  background: active ? T.green : "rgba(255,255,255,0.05)",
                  color: active ? "#000" : "rgba(255,255,255,0.6)",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  fontFamily: T.font, transition: "all 0.15s",
                }}
              >
                {mg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── GRID ── */}
      {isLoading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px" }}>
          <Dumbbell size={32} color="rgba(255,255,255,0.2)" strokeWidth={1.5} style={{ marginBottom: "12px" }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", margin: 0 }}>
            {search ? "Sin resultados para esa búsqueda." : "No hay ejercicios cargados aún."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "10px" }}>
          {filtered.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex} onClick={() => setSelected(ex)} />
          ))}
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {selected && (
        <BottomSheet onClose={() => setSelected(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Title row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: T.font, fontWeight: 800, fontSize: "20px", color: T.text, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
                  {selected.name}
                </h3>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <MuscleChip group={selected.muscle_group} />
                  {selected.difficulty && <DifficultyChip level={selected.difficulty} />}
                  {selected.equipment && (
                    <span style={{ fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", background: "#F3F4F6", color: T.muted }}>
                      {EQUIPMENT_LABELS[selected.equipment] ?? selected.equipment}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Video */}
            {selected.video_url ? (
              <ExerciseVideo videoUrl={selected.video_url} exerciseName={selected.name} />
            ) : (
              <div style={{ width: "100%", aspectRatio: "16/9", background: T.bg, borderRadius: "12px", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Play size={24} color={T.light} strokeWidth={1.5} />
                <p style={{ fontSize: "13px", color: T.light, margin: 0 }}>Video no cargado aún</p>
              </div>
            )}

            {/* Description */}
            {selected.description && (
              <p style={{ fontSize: "14px", color: T.muted, lineHeight: 1.6, margin: 0 }}>
                {selected.description}
              </p>
            )}

            {/* Instructions */}
            {selected.instructions && selected.instructions.length > 0 && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: T.light, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>
                  Ejecución
                </p>
                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selected.instructions.map((step, i) => (
                    <li key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: T.green, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font, fontWeight: 700, fontSize: "11px", color: "#fff", marginTop: "1px" }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: "13px", color: T.muted, lineHeight: 1.6 }}>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* ── NEW EXERCISE FORM ── */}
      {showForm && (
        <BottomSheet onClose={() => setShowForm(false)} title="Nuevo ejercicio">
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            <FormField label="Nombre *">
              <input
                type="text"
                placeholder="Ej: Sentadilla con barra"
                className="gymos-input"
                value={newEx.name}
                onChange={e => setNewEx(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <FormField label="Grupo muscular">
                <select className="gymos-select" value={newEx.muscle_group} onChange={e => setNewEx(p => ({ ...p, muscle_group: e.target.value }))}>
                  {MUSCLE_GROUPS.filter(m => m.value !== "all").map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Dificultad">
                <select className="gymos-select" value={newEx.difficulty} onChange={e => setNewEx(p => ({ ...p, difficulty: e.target.value }))}>
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzado</option>
                </select>
              </FormField>
            </div>

            <FormField label="Equipamiento">
              <select className="gymos-select" value={newEx.equipment} onChange={e => setNewEx(p => ({ ...p, equipment: e.target.value }))}>
                <option value="barbell">Barra</option>
                <option value="dumbbell">Mancuerna</option>
                <option value="machine">Máquina</option>
                <option value="cable">Cable</option>
                <option value="bodyweight">Peso corporal</option>
                <option value="bands">Bandas</option>
                <option value="kettlebell">Kettlebell</option>
                <option value="other">Otro</option>
              </select>
            </FormField>

            <FormField label="URL de YouTube">
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                className="gymos-input"
                value={newEx.video_url}
                onChange={e => setNewEx(p => ({ ...p, video_url: e.target.value }))}
              />
            </FormField>

            <FormField label="Descripción / instrucciones">
              <textarea
                rows={3}
                placeholder="Tips de ejecución, puntos clave..."
                className="gymos-input"
                style={{ height: "auto", resize: "none", padding: "12px 14px", lineHeight: 1.6 }}
                value={newEx.description}
                onChange={e => setNewEx(p => ({ ...p, description: e.target.value }))}
              />
            </FormField>

            <button
              onClick={saveExercise}
              disabled={isSaving || !newEx.name.trim()}
              className="gymos-btn gymos-btn-primary gymos-btn-full"
              style={{ marginTop: "4px", letterSpacing: "0.04em", textTransform: "uppercase", opacity: (!newEx.name.trim() || isSaving) ? 0.5 : 1 }}
            >
              {isSaving ? <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} />
               : saveOk  ? <><Check size={16} strokeWidth={3} /> Guardado</>
               : <><Plus size={16} /> Guardar ejercicio</>}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

/* ─────────────────────── ExerciseCard ── */

function ExerciseCard({ exercise: ex, onClick }: { exercise: Exercise; onClick: () => void }) {
  const colors = MUSCLE_COLORS[ex.muscle_group] ?? { bg: "#F3F4F6", text: "#374151" };
  const diff   = ex.difficulty ? DIFFICULTY_CONFIG[ex.difficulty] : null;
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: "left", cursor: "pointer",
        background: "#FFFFFF",
        border: `1px solid ${hover ? T.green : "rgba(255,255,255,0.12)"}`,
        borderRadius: "14px", padding: "14px",
        transition: "all 0.15s",
        transform: hover ? "translateY(-1px)" : "none",
        boxShadow: hover ? "0 4px 16px rgba(0,0,0,0.25)" : "0 1px 4px rgba(0,0,0,0.15)",
      }}
    >
      {/* Thumbnail / placeholder */}
      <div style={{
        width: "100%", height: "90px", borderRadius: "10px",
        background: colors.bg, marginBottom: "12px",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "4px",
        position: "relative", overflow: "hidden",
      }}>
        {ex.thumbnail_url ? (
          <img src={ex.thumbnail_url} alt={ex.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px" }} />
        ) : (
          <>
            <span style={{ fontFamily: T.font, fontWeight: 800, fontSize: "18px", color: colors.text, lineHeight: 1 }}>
              {(MUSCLE_LABELS[ex.muscle_group] ?? ex.muscle_group).slice(0, 3).toUpperCase()}
            </span>
            <Dumbbell size={14} color={colors.text} strokeWidth={1.5} style={{ opacity: 0.5 }} />
          </>
        )}
        {/* Video badge */}
        {ex.video_url && (
          <div style={{ position: "absolute", top: "6px", right: "6px", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={10} fill="#fff" color="#fff" />
          </div>
        )}
      </div>

      {/* Name */}
      <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "13px", color: T.text, margin: "0 0 8px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {ex.name}
      </p>

      {/* Tags */}
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        <MuscleChip group={ex.muscle_group} small />
        {diff && (
          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "999px", background: diff.bg, color: diff.color }}>
            {diff.label}
          </span>
        )}
      </div>
    </button>
  );
}

/* ─────────────────────── Shared sub-components ── */

function MuscleChip({ group, small }: { group: string; small?: boolean }) {
  const colors = MUSCLE_COLORS[group] ?? { bg: "#F3F4F6", text: "#374151" };
  return (
    <span style={{
      fontSize: small ? "10px" : "12px", fontWeight: 700,
      padding: small ? "2px 7px" : "3px 10px", borderRadius: "999px",
      background: colors.bg, color: colors.text,
    }}>
      {MUSCLE_LABELS[group] ?? group}
    </span>
  );
}

function DifficultyChip({ level }: { level: string }) {
  const cfg = DIFFICULTY_CONFIG[level];
  if (!cfg) return null;
  return (
    <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function BottomSheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title?: string }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div style={{ width: "100%", maxWidth: "560px", background: T.card, borderRadius: "24px 24px 0 0", maxHeight: "90vh", overflowY: "auto", padding: "24px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          {title
            ? <h3 style={{ fontFamily: T.font, fontWeight: 800, fontSize: "18px", color: T.text, margin: 0 }}>{title}</h3>
            : <div style={{ width: "40px", height: "4px", background: T.border, borderRadius: "999px", margin: "0 auto" }} />
          }
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.light, display: "flex", marginLeft: "auto" }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="gymos-label">{label}</label>
      {children}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "10px" }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ height: "160px", background: "rgba(255,255,255,0.06)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", opacity: 0.5 }} />
      ))}
    </div>
  );
}
