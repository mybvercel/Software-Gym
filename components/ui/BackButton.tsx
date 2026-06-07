"use client";

import { ArrowLeft } from "lucide-react";

/**
 * Large, high-contrast back button designed for accessibility
 * (older users): big touch target, visible border, clear label.
 *
 * Theme-aware: uses CSS variables so it always keeps proper contrast
 * in both dark and light themes. The optional `tone` prop is kept for
 * backwards compatibility but no longer changes the styling.
 */
export default function BackButton({
  onClick,
  label = "Volver",
}: {
  onClick: () => void;
  label?: string;
  tone?: "dark" | "light";
}) {
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
        background: "var(--bg-card)",
        border: "1.5px solid var(--border-default)",
        color: "var(--text-primary)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-elevated)";
        e.currentTarget.style.borderColor = "var(--border-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.borderColor = "var(--border-default)";
      }}
    >
      <ArrowLeft size={22} strokeWidth={2.5} />
      {label}
    </button>
  );
}
