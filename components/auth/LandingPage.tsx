"use client";

import { useRouter } from "next/navigation";
import { Dumbbell, ClipboardList } from "lucide-react";

interface Props {
  gymSlug: string;
  gymName: string;
}

export default function LandingPage({ gymSlug, gymName }: Props) {
  const router = useRouter();

  const go = (role: "member" | "trainer") => {
    router.push(`/gym/${gymSlug}/login?role=${role}`);
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#F5F5F5",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#111111",
    }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E5E7EB",
        padding: "0 40px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2V16M2 9H16" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontWeight: 700, fontSize: "15px", color: "#111111", letterSpacing: "-0.01em" }}>
            GymOS
          </span>
        </div>
        <div style={{ display: "flex", gap: "28px" }}>
          {["Contact", "About"].map(label => (
            <button key={label} style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              color: "#6B7280",
              fontWeight: 500,
              fontFamily: "inherit",
              padding: 0,
            }}>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── HERO ── */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        gap: 0,
      }}>

        {/* Título */}
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <h1 style={{
            fontSize: "clamp(40px, 6vw, 56px)",
            fontWeight: 800,
            color: "#0F172A",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: "0 0 12px 0",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            GymOS
          </h1>
          <p style={{
            fontSize: "15px",
            color: "#6B7280",
            fontWeight: 400,
            margin: 0,
            letterSpacing: "0.01em",
          }}>
            Your ultimate fitness management system.
          </p>
        </div>

        {/* ── CARDS ── */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          alignItems: "center",
          justifyContent: "center",
        }}>

          {/* ALUMNO — dark navy */}
          <RoleCard
            onClick={() => go("member")}
            bg="#0D1B2A"
            hoverBg="#142436"
            icon={<Dumbbell size={36} color="#FFFFFF" strokeWidth={1.5} />}
            label="Soy Alumno"
            labelColor="#FFFFFF"
          />

          {/* PROFE / ADMIN — white */}
          <RoleCard
            onClick={() => go("trainer")}
            bg="#FFFFFF"
            hoverBg="#F9FAFB"
            border="1.5px solid #E5E7EB"
            icon={<ClipboardList size={36} color="#16A34A" strokeWidth={1.5} />}
            label="Soy Profe / Administrador"
            labelColor="#0F172A"
          />

        </div>
      </main>
    </div>
  );
}

/* ── Sub-component to handle hover without Tailwind ── */
function RoleCard({
  onClick,
  bg,
  hoverBg,
  border,
  icon,
  label,
  labelColor,
}: {
  onClick: () => void;
  bg: string;
  hoverBg: string;
  border?: string;
  icon: React.ReactNode;
  label: string;
  labelColor: string;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = hoverBg;
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-4px)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 16px 48px rgba(0,0,0,0.18)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = bg;
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.10)";
      }}
      style={{
        width: "220px",
        height: "200px",
        backgroundColor: bg,
        border: border ?? "none",
        borderRadius: "18px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        outline: "none",
        padding: 0,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {icon}
      <span style={{
        fontSize: "15px",
        fontWeight: 700,
        color: labelColor,
        letterSpacing: "-0.01em",
        lineHeight: 1.2,
        textAlign: "center",
        padding: "0 16px",
      }}>
        {label}
      </span>
    </button>
  );
}
