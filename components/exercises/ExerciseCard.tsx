"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const MUSCLE_GROUP_ICONS: Record<string, string> = {
  chest: "🏋️",
  back: "🔙",
  shoulders: "💪",
  arms: "💪",
  legs: "🦵",
  glutes: "🍑",
  core: "⚡",
  cardio: "🏃",
  full_body: "🌐",
};

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: "Pecho",
  back: "Espalda",
  shoulders: "Hombros",
  arms: "Brazos",
  legs: "Piernas",
  glutes: "Glúteos",
  core: "Core",
  cardio: "Cardio",
  full_body: "Cuerpo completo",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "var(--color-success)",
  intermediate: "var(--color-warning)",
  advanced: "var(--color-danger)",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment?: string;
  difficulty?: string;
  video_url?: string;
  description?: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
  showSelect?: boolean;
}

export function ExerciseCard({ exercise, onSelect, showSelect }: ExerciseCardProps) {
  return (
    <div
      className="stat-card cursor-pointer group"
      onClick={() => onSelect?.(exercise)}
      style={{ padding: "1rem 1.25rem" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg text-lg flex-shrink-0"
          style={{ background: "var(--bg-glass-light)", border: "1px solid var(--border-subtle)" }}
        >
          {MUSCLE_GROUP_ICONS[exercise.muscle_group] ?? "💪"}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-sm mb-1 truncate group-hover:text-[var(--color-primary)] transition-colors"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
          >
            {exercise.name}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge badge-neutral text-xs">
              {MUSCLE_GROUP_LABELS[exercise.muscle_group] ?? exercise.muscle_group}
            </span>
            {exercise.difficulty && (
              <span
                className="text-xs font-medium"
                style={{ color: DIFFICULTY_COLORS[exercise.difficulty] ?? "var(--text-secondary)" }}
              >
                {DIFFICULTY_LABELS[exercise.difficulty]}
              </span>
            )}
            {exercise.equipment && (
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {exercise.equipment}
              </span>
            )}
          </div>
        </div>
        {showSelect && (
          <button
            className="btn btn-secondary btn-sm flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); onSelect?.(exercise); }}
          >
            +
          </button>
        )}
        {exercise.video_url && (
          <div
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,68,68,0.15)", color: "#FF4444" }}
            title="Video disponible"
          >
            ▶
          </div>
        )}
      </div>
    </div>
  );
}

export function MuscleGroupLabel({ group }: { group: string }) {
  return (
    <span>
      {MUSCLE_GROUP_ICONS[group]} {MUSCLE_GROUP_LABELS[group] ?? group}
    </span>
  );
}

export { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ICONS, DIFFICULTY_LABELS, DIFFICULTY_COLORS };
