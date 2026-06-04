"use client";

import { ArrowLeft } from "lucide-react";

/**
 * Large, high-contrast back button designed for accessibility
 * (older users): big touch target, visible border, clear label.
 */
export default function BackButton({
  onClick,
  label = "Volver",
  tone = "dark",
}: {
  onClick: () => void;
  label?: string;
  tone?: "dark" | "light";
}) {
  const isDark = tone === "dark";
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        height: "46px",
        padding: "0 18px 0 14px",
        borderRadius: "12px",
        cursor: "pointer",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        fontSize: "16px",
        fontWeight: 700,
        background: isDark ? "rgba(255,255,255,0.12)" : "#FFFFFF",
        border: isDark ? "1.5px solid rgba(255,255,255,0.30)" : "1.5px solid #CBD5E1",
        color: isDark ? "#FFFFFF" : "#0F172A",
        boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.20)" : "#F1F5F9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.12)" : "#FFFFFF";
      }}
    >
      <ArrowLeft size={22} strokeWidth={2.5} />
      {label}
    </button>
  );
}
