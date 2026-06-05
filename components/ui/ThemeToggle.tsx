"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Animated sun/moon theme switch with a smooth cross-fade (View Transitions
 * API where available). Persists the choice and applies it app-wide.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current =
      (document.documentElement.dataset.theme as "dark" | "light") ||
      (localStorage.getItem("gymos_theme") as "dark" | "light") ||
      "dark";
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      localStorage.setItem("gymos_theme", next);
      setTheme(next);
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (doc.startViewTransition) doc.startViewTransition(apply);
    else apply();
  };

  const isLight = theme === "light";

  return (
    <button
      onClick={toggle}
      aria-label={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      style={{
        position: "relative",
        width: "68px",
        height: "34px",
        borderRadius: "999px",
        cursor: "pointer",
        border: "1.5px solid var(--border-default)",
        background: isLight
          ? "linear-gradient(135deg, #7DD3FC 0%, #BAE6FD 100%)"
          : "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
        padding: 0,
        transition: "background 0.4s ease, border-color 0.4s ease",
        flexShrink: 0,
      }}
    >
      {/* sliding knob */}
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: isLight ? "37px" : "3px",
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          background: isLight ? "#FACC15" : "#E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isLight
            ? "0 0 12px rgba(250,204,21,0.7)"
            : "0 0 8px rgba(0,0,0,0.4)",
          transition: "left 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.35s ease, box-shadow 0.35s ease",
        }}
      >
        {isLight
          ? <Sun size={16} color="#92400E" strokeWidth={2.5} />
          : <Moon size={15} color="#475569" strokeWidth={2.5} />}
      </span>
    </button>
  );
}
