"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { getInitials, getDaysSince } from "@/lib/utils";
import { X, ClipboardList, ChevronRight } from "lucide-react";

/* ── Types ── */
interface Props {
  gymSlug: string;
  onAssignRoutine: (member: Profile) => void;
}

interface HealthProfile {
  goal?: string;
  experience_level?: string;
  days_per_week?: number;
  injuries?: string;
  uses_supplements?: boolean;
  supplements_detail?: string;
  objectives_detail?: string;
}

/* ── Label maps ── */
const GOAL_LABELS: Record<string, string> = {
  lose_weight: "Bajar de peso", gain_muscle: "Ganar músculo",
  tone: "Tonificar", endurance: "Resistencia", general_health: "Salud general",
};
const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado",
};

/* ── Component ── */
export default function MembersPanel({ gymSlug, onAssignRoutine }: Props) {
  const supabase = createClient();
  const [members,    setMembers]    = useState<Profile[]>([]);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState<"all" | "active" | "inactive">("all");
  const [isLoading,  setIsLoading]  = useState(true);
  const [healthModal, setHealthModal] = useState<{ member: Profile; data: HealthProfile | null } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("gym_id").eq("id", user.id).single();
    if (!profile) return;
    const { data } = await supabase
      .from("profiles").select("*")
      .eq("gym_id", profile.gym_id).eq("role", "member").order("full_name");
    setMembers((data as Profile[]) ?? []);
    setIsLoading(false);
  };

  const openHealthProfile = async (member: Profile) => {
    setHealthLoading(true);
    setHealthModal({ member, data: null });
    const { data } = await supabase
      .from("member_goals").select("*")
      .eq("member_id", member.id).maybeSingle();
    setHealthModal({ member, data: data as HealthProfile | null });
    setHealthLoading(false);
  };

  const toggleActive = async (member: Profile) => {
    await supabase.from("profiles").update({ is_active: !member.is_active }).eq("id", member.id);
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: !m.is_active } : m));
  };

  const filteredMembers = members.filter(m => {
    const matchSearch = !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || m.dni?.includes(search);
    const matchFilter = filter === "all" || (filter === "active" && m.is_active) || (filter === "inactive" && !m.is_active);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Alumnos
          <span className="ml-2 text-base font-normal" style={{ color: "var(--text-secondary)" }}>({filteredMembers.length})</span>
        </h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 relative min-w-48">
          <input type="text" placeholder="Buscar por nombre o DNI..." className="form-input"
            value={search} onChange={e => setSearch(e.target.value)} id="member-search" />
        </div>
        <select className="form-select" style={{ width: "auto" }} value={filter}
          onChange={e => setFilter(e.target.value as "all" | "active" | "inactive")} id="member-filter">
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12"><span className="loading-spinner mx-auto" /></div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map(m => (
            <div key={m.id} className="p-4 rounded-xl transition-all"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>

              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black flex-shrink-0"
                  style={{ background: m.is_active ? "var(--color-primary)" : "var(--text-tertiary)" }}>
                  {getInitials(m.full_name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                    {m.full_name}
                  </div>
                  <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
                    {m.dni && <span>DNI {m.dni}</span>}
                    {m.phone && <span>{m.phone}</span>}
                  </div>
                </div>

                {/* Status badge */}
                <span className={`badge hidden sm:inline-flex ${m.is_active ? "badge-success" : "badge-danger"}`}>
                  {m.is_active ? "Activo" : "Inactivo"}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openHealthProfile(m)}
                    className="btn btn-secondary btn-sm"
                    title="Ver perfil de salud"
                    id={`health-${m.id}`}>
                    <ClipboardList size={14} />
                    <span className="hidden sm:inline ml-1">Salud</span>
                  </button>
                  <button onClick={() => onAssignRoutine(m)} className="btn btn-secondary btn-sm" id={`assign-${m.id}`}>
                    Rutina
                  </button>
                  <button onClick={() => toggleActive(m)}
                    className={`btn btn-sm ${m.is_active ? "btn-danger" : "btn-secondary"}`}
                    id={`toggle-${m.id}`}>
                    {m.is_active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredMembers.length === 0 && (
            <div className="p-10 text-center rounded-2xl"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
              <p style={{ color: "var(--text-secondary)" }}>No se encontraron alumnos con ese criterio.</p>
            </div>
          )}
        </div>
      )}

      {/* ── HEALTH PROFILE MODAL ── */}
      {healthModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setHealthModal(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div style={{
            width: "100%", maxWidth: "560px",
            background: "var(--bg-elevated)", borderRadius: "24px 24px 0 0",
            border: "1px solid var(--border-default)",
            maxHeight: "85vh", overflowY: "auto",
            padding: "24px 20px 40px",
            fontFamily: "var(--font-body)",
          }}>
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "18px", color: "var(--text-primary)", margin: "0 0 4px" }}>
                  Perfil de salud
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                  {healthModal.member.full_name}
                </p>
              </div>
              <button onClick={() => setHealthModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                <X size={20} />
              </button>
            </div>

            {healthLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                <div className="gymos-spinner" />
              </div>
            ) : !healthModal.data ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <ClipboardList size={32} color="var(--text-muted)" strokeWidth={1.5} style={{ marginBottom: "12px" }} />
                <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                  Este alumno todavía no completó el cuestionario de salud.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                <HealthRow label="Objetivo principal"   value={GOAL_LABELS[healthModal.data.goal ?? ""] ?? healthModal.data.goal} />
                <HealthRow label="Nivel de experiencia" value={LEVEL_LABELS[healthModal.data.experience_level ?? ""] ?? healthModal.data.experience_level} />
                <HealthRow label="Días por semana"      value={healthModal.data.days_per_week ? `${healthModal.data.days_per_week} días` : undefined} />

                {healthModal.data.injuries && (
                  <HealthRow label="Lesiones / limitaciones" value={healthModal.data.injuries} multiline />
                )}

                <HealthRow
                  label="Suplementos / medicación"
                  value={healthModal.data.uses_supplements
                    ? (healthModal.data.supplements_detail || "Si (sin detalle)")
                    : "No"}
                />

                {healthModal.data.objectives_detail && (
                  <HealthRow label="Objetivos a largo plazo" value={healthModal.data.objectives_detail} multiline />
                )}

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthRow({ label, value, multiline }: { label: string; value?: string; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
      borderRadius: "12px", padding: "14px 16px",
    }}>
      <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 5px" }}>
        {label}
      </p>
      <p style={{
        fontSize: "14px", color: "var(--text-primary)", fontWeight: 500, margin: 0,
        lineHeight: multiline ? 1.6 : 1.3,
      }}>
        {value}
      </p>
    </div>
  );
}
