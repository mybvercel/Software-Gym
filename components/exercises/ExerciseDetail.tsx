"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ExerciseVideoProps {
  videoUrl: string;
  exerciseName: string;
}

export function ExerciseVideo({ videoUrl, exerciseName }: ExerciseVideoProps) {
  const videoId = videoUrl?.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
  if (!videoId) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl" style={{ aspectRatio: "16/9", background: "#000" }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
        title={exerciseName}
        className="w-full h-full"
        allowFullScreen
        loading="lazy"
      />
    </div>
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
