"use client";

import { useState, useEffect } from "react";
import { Dumbbell } from "lucide-react";

const PHRASES = [
  "Calentando los músculos...",
  "Preparando tu rutina...",
  "Cargando las pesas...",
  "Un segundo, vamos con todo...",
  "Ajustando los discos...",
];

/**
 * Fun, on-brand loading screen: a dumbbell doing curls with a glow and a
 * bouncing floor shadow, plus rotating motivational phrases.
 */
export default function GymLoader({
  label,
  fullScreen = false,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  const [phrase, setPhrase] = useState(label ?? PHRASES[0]);

  useEffect(() => {
    if (label) return; // fixed label, no rotation
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % PHRASES.length;
      setPhrase(PHRASES[i]);
    }, 1600);
    return () => clearInterval(t);
  }, [label]);

  const content = (
    <div className="gym-loader">
      <Dumbbell className="gym-loader__dumbbell" size={52} strokeWidth={2} />
      <div className="gym-loader__shadow" />
      <p className="gym-loader__text">{phrase}</p>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-root)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {content}
    </div>
  );
}
