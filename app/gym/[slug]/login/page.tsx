"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Dumbbell, ClipboardList, ArrowLeft } from "lucide-react";
import MemberAccessForm from "@/components/auth/MemberAccessForm";
import TrainerLoginForm from "@/components/auth/TrainerLoginForm";

const GYM_NAMES: Record<string, string> = {
  antigravity: "Antigravity Gym",
  "iron-house": "Iron House",
  "power-fitness": "Power Fitness Center",
};

export default function LoginPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = params.slug;
  const role = searchParams.get("role") as "member" | "trainer" | null;
  const gymName = GYM_NAMES[slug] ?? slug;

  const isMember = role === "member";
  const isTrainer = role === "trainer";

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "var(--bg-root)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "var(--font-body)",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
    }}>

      {/* Volver */}
      <div style={{ width: "100%", maxWidth: "420px", marginBottom: "20px" }}>
        <button
          onClick={() => router.push(`/gym/${slug}`)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", cursor: "pointer",
            fontSize: "14px", color: "var(--text-secondary)", fontWeight: 500,
            fontFamily: "inherit", padding: 0,
            transition: "color 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
        >
          <ArrowLeft size={15} />
          Volver a roles
        </button>
      </div>

      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: "420px",
        backgroundColor: "var(--bg-card)",
        borderRadius: "20px",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-elevated)",
        padding: "36px 32px 40px",
      }}>

        {/* Header */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <div style={{
            width: "60px", height: "60px",
            borderRadius: "16px",
            backgroundColor: isMember ? "#0D1B2A" : "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            {isMember
              ? <Dumbbell size={28} color="#FFFFFF" strokeWidth={1.5} />
              : <ClipboardList size={28} color="var(--lime)" strokeWidth={1.5} />
            }
          </div>
          <h2 style={{
            fontSize: "22px", fontWeight: 800, color: "var(--text-primary)",
            letterSpacing: "-0.02em", margin: "0 0 6px",
            fontFamily: "var(--font-display)",
          }}>
            {isMember ? "Soy Alumno" : "Soy Profe / Administrador"}
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
            {gymName}
          </p>
        </div>

        {isMember && <MemberAccessForm gymSlug={slug} />}
        {isTrainer && <TrainerLoginForm slug={slug} />}
        {!role && (
          <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
            Rol inválido.{" "}
            <button onClick={() => router.push(`/gym/${slug}`)}
              style={{ background: "none", border: "none", color: "var(--lime)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
              Volver
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
