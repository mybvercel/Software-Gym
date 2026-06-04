"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ExerciseVideoProps {
  videoUrl?: string;
  exerciseName: string;
  posterUrl?: string;   // custom photo shown instantly (fallback while video loads)
}

/**
 * Lite YouTube embed: shows the exercise photo (or YouTube thumbnail)
 * immediately with a play button, and only loads the iframe when tapped.
 * This means the user always sees an image right away — even if the video
 * is slow to load — and the page stays fast.
 */
export function ExerciseVideo({ videoUrl, exerciseName, posterUrl }: ExerciseVideoProps) {
  const [playing, setPlaying] = useState(false);
  const videoId = videoUrl?.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1];

  // No video at all → just show the photo if we have one
  if (!videoId) {
    if (!posterUrl) return null;
    return (
      <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden", background: "#000" }}>
        <img src={posterUrl} alt={exerciseName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

  const poster = posterUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (playing) {
    return (
      <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden", background: "#000" }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1`}
          title={exerciseName}
          style={{ width: "100%", height: "100%", border: 0 }}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      aria-label={`Reproducir video de ${exerciseName}`}
      style={{
        position: "relative", width: "100%", aspectRatio: "16/9",
        borderRadius: "12px", overflow: "hidden", border: "none",
        padding: 0, cursor: "pointer", background: "#000", display: "block",
      }}
    >
      <img
        src={poster}
        alt={exerciseName}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {/* dark overlay + play button */}
      <span style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)" }} />
      <span style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "62px", height: "62px", borderRadius: "50%",
        background: "rgba(0,0,0,0.55)", border: "2px solid rgba(255,255,255,0.9)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: "3px" }}>
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  );
}

interface ExerciseDetailProps {
  exercise: {
    id: string;
    name: string;
    description?: string;
    muscle_group: string;
    equipment?: string;
    difficulty?: string;
    video_url?: string;
    instructions?: string[];
  };
  sets?: number;
  reps?: string;
  rest_seconds?: number;
  notes?: string;
  onLogProgress?: (data: {
    sets_completed: number;
    reps_completed: string;
    weight_kg?: number;
    perceived_effort?: number;
  }) => Promise<void>;
}

export function ExerciseDetail({
  exercise,
  sets = 3,
  reps = "10",
  rest_seconds = 60,
  notes,
  onLogProgress,
}: ExerciseDetailProps) {
  const [isLogging, setIsLogging] = useState(false);
  const [logData, setLogData] = useState({
    weight_kg: "",
    effort: "7",
    reps_done: reps,
  });
  const [success, setSuccess] = useState(false);

  const handleLog = async () => {
    if (!onLogProgress) return;
    setIsLogging(true);
    try {
      await onLogProgress({
        sets_completed: sets,
        reps_completed: logData.reps_done,
        weight_kg: logData.weight_kg ? parseFloat(logData.weight_kg) : undefined,
        perceived_effort: parseInt(logData.effort),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Video */}
      {exercise.video_url && (
        <ExerciseVideo videoUrl={exercise.video_url} exerciseName={exercise.name} />
      )}

      {/* Info header */}
      <div>
        <h2
          className="text-xl font-bold mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          {exercise.name}
        </h2>
        {exercise.description && (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{exercise.description}</p>
        )}
      </div>

      {/* Prescription */}
      <div
        className="grid grid-cols-3 gap-3 p-4 rounded-xl"
        style={{ background: "var(--color-primary-dim)", border: "1px solid var(--border-primary)" }}
      >
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>{sets}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Series</div>
        </div>
        <div className="text-center" style={{ borderLeft: "1px solid var(--border-primary)", borderRight: "1px solid var(--border-primary)" }}>
          <div className="text-2xl font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>{reps}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Reps</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>{rest_seconds}s</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Descanso</div>
        </div>
      </div>

      {/* Instructions */}
      {exercise.instructions && exercise.instructions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Ejecución
          </h3>
          <ol className="space-y-2">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-black"
                  style={{ background: "var(--color-primary)", marginTop: "1px" }}
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {notes && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.2)", color: "var(--color-warning)" }}
        >
          📝 {notes}
        </div>
      )}

      {/* Log Progress */}
      {onLogProgress && (
        <div
          className="p-4 rounded-xl space-y-4"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Registrar sesión
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Peso usado (Kg)</label>
              <input
                type="number"
                placeholder="ej: 80"
                min="0"
                step="0.5"
                className="form-input"
                value={logData.weight_kg}
                onChange={(e) => setLogData((d) => ({ ...d, weight_kg: e.target.value }))}
                id={`weight-${exercise.id}`}
              />
            </div>
            <div>
              <label className="form-label text-xs">Esfuerzo percibido (1-10)</label>
              <input
                type="range"
                min="1"
                max="10"
                className="w-full mt-3"
                value={logData.effort}
                onChange={(e) => setLogData((d) => ({ ...d, effort: e.target.value }))}
                id={`effort-${exercise.id}`}
              />
              <div className="text-center text-sm font-bold" style={{ color: "var(--color-primary)" }}>
                {logData.effort}/10
              </div>
            </div>
          </div>
          <div>
            <label className="form-label text-xs">Reps por serie (ej: 10,10,8)</label>
            <input
              type="text"
              placeholder="10,10,8"
              className="form-input"
              value={logData.reps_done}
              onChange={(e) => setLogData((d) => ({ ...d, reps_done: e.target.value }))}
              id={`reps-${exercise.id}`}
            />
          </div>
          {success ? (
            <div className="btn btn-full" style={{ background: "rgba(0,230,118,0.15)", color: "var(--color-success)", border: "1px solid rgba(0,230,118,0.3)", borderRadius: "var(--radius-md)", padding: "0.75rem", textAlign: "center", fontWeight: 600 }}>
              ✅ ¡Registrado!
            </div>
          ) : (
            <button
              onClick={handleLog}
              disabled={isLogging}
              className="btn btn-primary btn-full"
              id={`log-exercise-${exercise.id}`}
            >
              {isLogging ? <><span className="loading-spinner" /> Guardando...</> : "✓ Marcar como completado"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
