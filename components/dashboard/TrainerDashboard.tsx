"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import RoutineBuilder from "./RoutineBuilder";
import ExerciseLibrary from "./ExerciseLibrary";
import PaymentsPanel from "./PaymentsPanel";
import NewMemberModal from "./NewMemberModal";
import CSVImportModal from "./CSVImportModal";
import {
  Home, Users, Dumbbell, Settings, LogOut,
  Search, Plus, ChevronRight, AlertCircle,
  CheckCircle, Clock, BarChart2, UserCheck,
} from "lucide-react";

/* ─────────────────────────── Types ── */

interface MemberWithStatus extends Profile {
  lastAttendance?: string | null;
  paymentStatus: "ok" | "expiring" | "expired" | "none";
  paymentDaysLeft?: number;
  trainedToday: boolean;
  trainedThisWeek: boolean;
}

type Tab = "home" | "members" | "exercises" | "config";

/* ─────────────────────────── Avatar palette ── */

const AVATAR_COLORS = [
  "#3B82F6","#8B5CF6","#EC4899","#F59E0B",
  "#10B981","#EF4444","#06B6D4","#84CC16",
];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ─────────────────────────── Design tokens (trainer — green/white) ── */

const T = {
  navy:    "#0D1B2A",
  navyMid: "#112236",
  green:   "#22C55E",
  greenDim:"rgba(34,197,94,0.12)",
  greenBorder:"rgba(34,197,94,0.3)",
  white:   "#FFFFFF",
  bg:      "#F1F5F9",
  card:    "#FFFFFF",
  border:  "#E2E8F0",
  text:    "#0F172A",
  muted:   "#64748B",
  light:   "#94A3B8",
  red:     "#EF4444",
  redDim:  "rgba(239,68,68,0.10)",
  orange:  "#F97316",
  orangeDim:"rgba(249,115,22,0.10)",
  font:    "'Space Grotesk', system-ui, sans-serif",
};

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */

export default function TrainerDashboard({ gymSlug }: { gymSlug: string }) {
  const supabase = createClient();
  const router   = useRouter();

  const [activeTab,    setActiveTab]    = useState<Tab>("home");
  const [trainerName,  setTrainerName]  = useState("Profe");
  const [gymName,      setGymName]      = useState("GymOS");
  const [gymId,        setGymId]        = useState<string | null>(null);
  const [members,      setMembers]      = useState<MemberWithStatus[]>([]);
  const [search,       setSearch]       = useState("");
  const [isLoading,    setIsLoading]    = useState(true);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [showBuilder,    setShowBuilder]    = useState(false);
  const [showNewMember,  setShowNewMember]  = useState(false);
  const [showCSVImport,  setShowCSVImport]  = useState(false);

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - 7);

  /* ── Load ── */
  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) { router.push(`/gym/${gymSlug}/login?role=trainer`); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, gym_id, gyms(name)")
      .eq("id", user.id)
      .single();

    if (!profile) { setIsLoading(false); return; }
    setTrainerName(profile.full_name);
    setGymName((profile.gyms as any)?.name ?? "GymOS");
    setGymId(profile.gym_id);
    await loadMembers(profile.gym_id);
  };

  const loadMembers = async (gid: string) => {
    setIsLoading(true);
    const [
      { data: profilesData },
      { data: attendanceData },
      { data: paymentsData },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("gym_id", gid).eq("role", "member").order("full_name"),
      supabase.from("attendance").select("member_id, checked_in_at").eq("gym_id", gid).gte("checked_in_at", weekStart.toISOString()),
      supabase.from("payments").select("member_id, status, period_to").eq("gym_id", gid).order("period_to", { ascending: false }),
    ]);

    const profiles   = (profilesData  ?? []) as Profile[];
    const attendance = (attendanceData ?? []) as { member_id: string; checked_in_at: string }[];
    const payments   = (paymentsData   ?? []) as { member_id: string; status: string; period_to?: string }[];

    // Build attendance maps
    const trainedTodaySet = new Set(
      attendance.filter(a => new Date(a.checked_in_at) >= todayStart).map(a => a.member_id)
    );
    const trainedWeekSet  = new Set(attendance.map(a => a.member_id));

    // Payment map: last payment per member
    const paymentMap = new Map<string, { status: string; period_to?: string }>();
    for (const p of payments) {
      if (!paymentMap.has(p.member_id)) paymentMap.set(p.member_id, p);
    }

    const enriched: MemberWithStatus[] = profiles.map(p => {
      const pay = paymentMap.get(p.id);
      let paymentStatus: MemberWithStatus["paymentStatus"] = "none";
      let paymentDaysLeft: number | undefined;

      if (pay) {
        if (pay.status === "approved") {
          if (pay.period_to) {
            const daysLeft = Math.ceil((new Date(pay.period_to).getTime() - Date.now()) / 86400000);
            paymentDaysLeft = daysLeft;
            paymentStatus = daysLeft < 0 ? "expired" : daysLeft <= 5 ? "expiring" : "ok";
          } else {
            paymentStatus = "ok";
          }
        } else if (pay.status === "pending") {
          paymentStatus = "expiring";
        } else {
          paymentStatus = "expired";
        }
      }

      return {
        ...p,
        trainedToday:    trainedTodaySet.has(p.id),
        trainedThisWeek: trainedWeekSet.has(p.id),
        paymentStatus,
        paymentDaysLeft,
      };
    });

    setMembers(enriched);
    setIsLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push(`/gym/${gymSlug}/login?role=trainer`);
  };

  /* ── Derived stats ── */
  const activeCount    = members.filter(m => m.is_active).length;
  const trainingToday  = members.filter(m => m.trainedToday).length;
  const expiredCount   = members.filter(m => m.paymentStatus === "expired").length;

  const filtered = members.filter(m =>
    !search ||
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.dni?.includes(search)
  );

  const dateStr = new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });

  /* ══════════ RENDER ══════════ */

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, display: "flex", flexDirection: "column", position: "relative" }}>

      {/* ── NEW MEMBER MODAL ── */}
      {showNewMember && (
        <NewMemberModal
          gymSlug={gymSlug}
          onClose={() => setShowNewMember(false)}
          onCreated={() => gymId ? loadMembers(gymId) : undefined}
        />
      )}

      {/* ── CSV IMPORT MODAL ── */}
      {showCSVImport && (
        <CSVImportModal
          gymSlug={gymSlug}
          onClose={() => setShowCSVImport(false)}
          onImported={() => gymId ? loadMembers(gymId) : undefined}
        />
      )}

      {/* ── ROUTINE BUILDER OVERLAY ── */}
      {showBuilder && selectedMember && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            width: "100%", maxWidth: "860px", height: "90vh",
            background: "var(--bg-card)", borderRadius: "24px 24px 0 0",
            border: "1px solid var(--border-subtle)", overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)",
            }}>
              <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: "15px", color: T.text }}>
                Rutina para {selectedMember.full_name}
              </span>
              <button onClick={() => setShowBuilder(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: T.muted }}>
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
              <RoutineBuilder gymSlug={gymSlug} preselectedMember={selectedMember} onClose={() => setShowBuilder(false)} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          HOME TAB
      ══════════════════════════════════ */}
      {activeTab === "home" && (
        <>
          {/* Dark navy header */}
          <div style={{ background: T.navy, padding: "48px 20px 28px" }}>
            <div style={{ maxWidth: "640px", margin: "0 auto" }}>

              {/* Greeting */}
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", fontWeight: 500, margin: "0 0 4px", textTransform: "capitalize" }}>
                {dateStr}
              </p>
              <h1 style={{
                fontFamily: T.font, fontWeight: 800,
                fontSize: "clamp(22px, 5vw, 30px)", color: "#FFFFFF",
                letterSpacing: "-0.02em", margin: "0 0 24px",
              }}>
                Hola, {trainerName.split(" ")[0]}
              </h1>

              {/* Stat cards — horizontal scroll */}
              <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px", marginRight: "-20px", paddingRight: "20px" }}>
                <StatCard
                  label="Alumnos activos"
                  value={isLoading ? "–" : String(activeCount)}
                  icon={<UserCheck size={16} />}
                  color={T.green}
                  dim={T.greenDim}
                />
                <StatCard
                  label="Entrenan hoy"
                  value={isLoading ? "–" : String(trainingToday)}
                  icon={<CheckCircle size={16} />}
                  color="#3B82F6"
                  dim="rgba(59,130,246,0.12)"
                />
                <StatCard
                  label="Cuotas vencidas"
                  value={isLoading ? "–" : String(expiredCount)}
                  icon={<AlertCircle size={16} />}
                  color={expiredCount > 0 ? T.red : T.light}
                  dim={expiredCount > 0 ? T.redDim : "rgba(148,163,184,0.1)"}
                />
              </div>
            </div>
          </div>

          {/* White content */}
          <div style={{ flex: 1, background: T.bg, paddingBottom: "80px" }}>
            <div style={{ maxWidth: "640px", margin: "0 auto", padding: "24px 16px" }}>

              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <h2 style={{ fontFamily: T.font, fontWeight: 800, fontSize: "18px", color: T.text, margin: 0 }}>
                  Tus alumnos
                </h2>
                <button
                  onClick={() => setShowNewMember(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 14px", borderRadius: "10px",
                    background: T.green, border: "none", cursor: "pointer",
                    fontFamily: T.font, fontWeight: 700, fontSize: "13px", color: "#fff",
                  }}
                >
                  <Plus size={14} /> Nuevo alumno
                </button>
                <button
                  onClick={() => setShowCSVImport(true)}
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px", borderRadius: "10px", background: "transparent", border: `1px solid rgba(255,255,255,0.15)`, cursor: "pointer", fontFamily: T.font, fontWeight: 600, fontSize: "13px", color: "rgba(255,255,255,0.7)" }}
                >
                  Importar
                </button>
              </div>

              {/* Search */}
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <Search size={15} color={T.light} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o DNI..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%", height: "42px", paddingLeft: "36px", paddingRight: "14px",
                    background: T.card, border: `1px solid ${T.border}`, borderRadius: "10px",
                    fontFamily: T.font, fontSize: "14px", color: T.text,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Member list */}
              {isLoading ? (
                <LoadingList />
              ) : filtered.length === 0 ? (
                <EmptyMembers hasSearch={!!search} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {filtered.map(m => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      gymSlug={gymSlug}
                      onAssignRoutine={() => { setSelectedMember(m); setShowBuilder(true); }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════
          ALUMNOS TAB (full management)
      ══════════════════════════════════ */}
      {activeTab === "members" && (
        <div style={{ flex: 1, background: T.bg, paddingBottom: "80px" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "20px 16px" }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ fontFamily: T.font, fontWeight: 800, fontSize: "20px", color: T.text, margin: 0 }}>
                Alumnos <span style={{ fontSize: "14px", fontWeight: 500, color: T.muted }}>({filtered.length})</span>
              </h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setShowCSVImport(true)}
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px", borderRadius: "10px", background: "transparent", border: `1px solid ${T.border}`, cursor: "pointer", fontFamily: T.font, fontWeight: 600, fontSize: "13px", color: T.muted }}
                >
                  Importar
                </button>
                <button
                  onClick={() => setShowNewMember(true)}
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px", borderRadius: "10px", background: T.green, border: "none", cursor: "pointer", fontFamily: T.font, fontWeight: 700, fontSize: "13px", color: "#fff" }}
                >
                  <Plus size={14} /> Nuevo
                </button>
              </div>
            </div>

            <div style={{ position: "relative", marginBottom: "14px" }}>
              <Search size={15} color={T.light} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", height: "42px", paddingLeft: "36px", paddingRight: "14px", background: T.card, border: `1px solid ${T.border}`, borderRadius: "10px", fontFamily: T.font, fontSize: "14px", color: T.text, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {isLoading ? <LoadingList /> : filtered.map(m => (
                <MemberCard key={m.id} member={m} gymSlug={gymSlug}
                  onAssignRoutine={() => { setSelectedMember(m); setShowBuilder(true); }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          EJERCICIOS TAB
      ══════════════════════════════════ */}
      {activeTab === "exercises" && (
        <div style={{ flex: 1, background: T.navy, padding: "24px 16px 80px" }}>
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            <ExerciseLibrary gymSlug={gymSlug} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          CONFIG TAB
      ══════════════════════════════════ */}
      {activeTab === "config" && (
        <div style={{ flex: 1, background: T.bg, paddingBottom: "80px" }}>
          <div style={{ maxWidth: "500px", margin: "0 auto", padding: "32px 16px" }}>
            <h2 style={{ fontFamily: T.font, fontWeight: 800, fontSize: "20px", color: T.text, margin: "0 0 24px" }}>Configuración</h2>

            {/* Profile card */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "20px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "52px", height: "52px", borderRadius: "50%", flexShrink: 0,
                background: T.green, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: T.font, fontWeight: 800, fontSize: "18px", color: "#fff",
              }}>
                {getInitials(trainerName)}
              </div>
              <div>
                <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "16px", color: T.text, margin: 0 }}>{trainerName}</p>
                <p style={{ fontSize: "13px", color: T.muted, margin: "3px 0 0" }}>{gymName} · Entrenador</p>
              </div>
            </div>

            <ConfigRow icon={<BarChart2 size={17} />} label="Pagos y cobros" onClick={() => {}} />
            <ConfigRow icon={<Users size={17} />} label="Gestión de alumnos" onClick={() => setActiveTab("members")} />
            <ConfigRow icon={<Dumbbell size={17} />} label="Biblioteca de ejercicios" onClick={() => setActiveTab("exercises")} />

            <button
              onClick={logout}
              style={{
                width: "100%", height: "48px", marginTop: "20px",
                background: T.redDim, border: `1px solid rgba(239,68,68,0.25)`,
                borderRadius: "12px", cursor: "pointer",
                fontFamily: T.font, fontWeight: 700, fontSize: "14px", color: T.red,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        height: "68px", background: T.card,
        borderTop: `1px solid ${T.border}`,
        display: "flex",
      }}>
        {([
          { id: "home",      icon: Home,     label: "Home" },
          { id: "members",   icon: Users,    label: "Alumnos" },
          { id: "exercises", icon: Dumbbell, label: "Ejercicios" },
          { id: "config",    icon: Settings, label: "Config" },
        ] as { id: Tab; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "4px",
              background: "none", border: "none", cursor: "pointer",
              color: active ? T.green : T.light,
              transition: "color 0.2s",
            }}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              <span style={{ fontSize: "10px", fontWeight: active ? 700 : 500 }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ─────────────────────────── Sub-components ── */

function StatCard({ label, value, icon, color, dim }: {
  label: string; value: string; icon: React.ReactNode; color: string; dim: string;
}) {
  return (
    <div style={{
      flexShrink: 0, minWidth: "140px",
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "14px", padding: "14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "8px",
          background: dim, display: "flex", alignItems: "center", justifyContent: "center",
          color,
        }}>
          {icon}
        </div>
      </div>
      <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: "26px", color: "#FFFFFF", margin: "0 0 3px", lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0, fontWeight: 500 }}>
        {label}
      </p>
    </div>
  );
}

function MemberCard({ member: m, gymSlug, onAssignRoutine }: {
  member: MemberWithStatus;
  gymSlug: string;
  onAssignRoutine: () => void;
}) {
  const router = useRouter();
  const bgColor = avatarColor(m.full_name);

  const activityDot = m.trainedToday
    ? { color: T.green, label: "Entrenó hoy" }
    : m.trainedThisWeek
    ? { color: T.orange, label: "Esta semana" }
    : { color: T.red, label: "+7 días sin entrenar" };

  const payBadge = m.paymentStatus === "ok"
    ? { bg: T.greenDim, border: T.greenBorder, color: T.green, text: "Al día" }
    : m.paymentStatus === "expiring"
    ? { bg: T.orangeDim, border: "rgba(249,115,22,0.3)", color: T.orange, text: m.paymentDaysLeft != null ? `Vence en ${m.paymentDaysLeft}d` : "Por vencer" }
    : m.paymentStatus === "expired"
    ? { bg: T.redDim, border: "rgba(239,68,68,0.3)", color: T.red, text: "Vencida" }
    : null;

  return (
    <div
      style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: "14px", padding: "14px 14px 14px 14px",
        display: "flex", alignItems: "center", gap: "12px",
        cursor: "pointer", transition: "box-shadow 0.15s",
      }}
      onClick={() => router.push(`/gym/${gymSlug}/dashboard/trainer/members/${m.id}`)}
    >
      {/* Avatar */}
      <div style={{
        width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
        background: bgColor,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: T.font, fontWeight: 800, fontSize: "15px", color: "#fff",
        position: "relative",
      }}>
        {getInitials(m.full_name)}
        {/* Activity dot */}
        <span style={{
          position: "absolute", bottom: "1px", right: "1px",
          width: "10px", height: "10px", borderRadius: "50%",
          background: activityDot.color,
          border: `2px solid ${T.card}`,
        }} title={activityDot.label} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "14px", color: T.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {m.full_name}
        </p>
        <p style={{ fontSize: "12px", color: T.muted, margin: "2px 0 0" }}>
          {m.dni ? `DNI ${m.dni}` : "Sin DNI"}
        </p>
      </div>

      {/* Payment badge */}
      {payBadge && (
        <span style={{
          flexShrink: 0, fontSize: "11px", fontWeight: 700,
          padding: "3px 10px", borderRadius: "999px",
          background: payBadge.bg, border: `1px solid ${payBadge.border}`,
          color: payBadge.color, fontFamily: T.font,
        }}>
          {payBadge.text}
        </span>
      )}

      <ChevronRight size={16} color={T.light} style={{ flexShrink: 0 }} />
    </div>
  );
}

function ConfigRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", marginBottom: "8px",
        background: T.card, border: `1px solid ${T.border}`, borderRadius: "12px",
        cursor: "pointer", fontFamily: T.font,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", color: T.text, fontWeight: 600, fontSize: "14px" }}>
        <span style={{ color: T.muted }}>{icon}</span>
        {label}
      </div>
      <ChevronRight size={16} color={T.light} />
    </button>
  );
}

function LoadingList() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          height: "72px",
          borderRadius: "14px", opacity: 0.5,
          background: `linear-gradient(90deg, ${T.card} 25%, ${T.bg} 50%, ${T.card} 75%)`,
          border: `1px solid ${T.border}`,
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
        }} />
      ))}
    </div>
  );
}

function EmptyMembers({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", background: T.card, border: `1px solid ${T.border}`, borderRadius: "14px" }}>
      <Users size={32} color={T.light} strokeWidth={1.5} style={{ marginBottom: "12px" }} />
      <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "15px", color: T.text, margin: "0 0 6px" }}>
        {hasSearch ? "Sin resultados" : "Sin alumnos aún"}
      </p>
      <p style={{ fontSize: "13px", color: T.muted, margin: 0 }}>
        {hasSearch ? "Probá con otro nombre o DNI." : "Los alumnos que se registren aparecerán aquí."}
      </p>
    </div>
  );
}
