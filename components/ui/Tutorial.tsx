"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dumbbell, Home, Play, TrendingUp, ClipboardList, CheckCircle,
  ArrowRight, ArrowLeft, X,
} from "lucide-react";

interface Slide {
  img: string;
  alt: string;
  icon: React.ReactNode;
  anim: string;
  title: string;
  body: string;
}

const ICON_SIZE = 28;

const SLIDES: Slide[] = [
  {
    img: "/tutorial/slide1.png",
    alt: "Personaje saludando, dándote la bienvenida",
    icon: <Dumbbell size={ICON_SIZE} color="var(--lime)" strokeWidth={2.2} />,
    anim: "gymosIconWiggle 2.4s ease-in-out infinite",
    title: "Bienvenido a GymOS",
    body: "Tu entrenamiento, organizado y simple. Te muestro cómo funciona en 30 segundos.",
  },
  {
    img: "/tutorial/slide2.png",
    alt: "Personaje mirando su rutina del día en el celular",
    icon: <Home size={ICON_SIZE} color="var(--lime)" strokeWidth={2.2} />,
    anim: "gymosIconPop 2.2s ease-in-out infinite",
    title: "Tu día de entrenamiento",
    body: "En la pestaña Inicio ves qué músculo te toca hoy y tu rutina. Si es día de descanso, también te avisa.",
  },
  {
    img: "/tutorial/slide3.png",
    alt: "Personaje entrenando siguiendo un video",
    icon: <Play size={ICON_SIZE} color="var(--lime)" strokeWidth={2.2} />,
    anim: "gymosIconPop 1.8s ease-in-out infinite",
    title: "Entrená con videos",
    body: "Tocá «Empezar entrenamiento». Cada ejercicio tiene video, fotos e instrucciones. Marcá cada serie y el descanso arranca solo.",
  },
  {
    img: "/tutorial/slide4.png",
    alt: "Personaje flexionando el brazo junto a un gráfico de progreso",
    icon: <TrendingUp size={ICON_SIZE} color="var(--lime)" strokeWidth={2.2} />,
    anim: "gymosIconRise 2.2s ease-in-out infinite",
    title: "Mirá tu progreso",
    body: "Registrá cuánto levantás en cada ejercicio y mirá tu evolución semana a semana, junto con tu calendario de asistencia.",
  },
  {
    img: "/tutorial/slide5.png",
    alt: "Personaje completando su perfil y preferencias",
    icon: <ClipboardList size={ICON_SIZE} color="var(--lime)" strokeWidth={2.2} />,
    anim: "gymosIconWiggle 2.6s ease-in-out infinite",
    title: "Tu perfil",
    body: "Completá tu cuestionario de salud para que tu profe te arme el plan ideal. Podés dejarle comentarios y cambiar a modo claro.",
  },
  {
    img: "/tutorial/slide6.png",
    alt: "Personaje festejando, listo para arrancar",
    icon: <CheckCircle size={ICON_SIZE} color="var(--lime)" strokeWidth={2.2} />,
    anim: "gymosIconPop 2s ease-in-out infinite",
    title: "¡Listo para arrancar!",
    body: "Eso es todo. Cualquier duda, escribile a tu profe desde tu perfil. ¡A entrenar!",
  },
];

export default function Tutorial({ onFinish }: { onFinish: () => void }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "var(--bg-root)",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-body)",
      animation: "fadeIn 0.3s ease",
    }}>
      {/* Top bar: skip */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "18px", color: "var(--text-primary)" }}>
          Tutorial
        </span>
        <button
          onClick={onFinish}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-secondary)", fontSize: "16px", fontWeight: 600,
            fontFamily: "var(--font-display)", padding: "6px",
          }}
        >
          Saltar <X size={18} />
        </button>
      </div>

      {/* Slide */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "20px 28px",
      }}>
        <div style={{
          position: "relative",
          width: "clamp(180px, 56vw, 248px)",
          aspectRatio: "1 / 1",
          borderRadius: "32px",
          background: "radial-gradient(circle at 50% 32%, #1b2532 0%, #0e1117 78%)",
          border: "1.5px solid rgba(158,255,0,0.28)",
          boxShadow: "0 18px 50px -18px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.02)",
          overflow: "hidden",
          marginBottom: "clamp(24px, 5vh, 36px)",
        }}>
          {/* Shimmer de fondo mientras carga la primera imagen */}
          <div className="gymos-shimmer" style={{ position: "absolute", inset: 0, zIndex: 0 }} />

          {/* Las 6 imágenes se precargan todas; se hace crossfade entre ellas */}
          {SLIDES.map((slide, idx) => (
            <Image
              key={slide.img}
              src={slide.img}
              alt={slide.alt}
              fill
              priority={idx === 0}
              loading={idx === 0 ? undefined : "eager"}
              sizes="(max-width: 480px) 56vw, 248px"
              style={{
                objectFit: "contain", padding: "6px", zIndex: 1,
                opacity: idx === i ? 1 : 0,
                transition: "opacity 0.4s ease",
              }}
            />
          ))}

          {/* Ícono animado superpuesto, esquina superior izquierda */}
          <div style={{
            position: "absolute", top: "12px", left: "12px", zIndex: 2,
            width: "clamp(44px, 13vw, 54px)", height: "clamp(44px, 13vw, 54px)",
            borderRadius: "16px",
            background: "rgba(13,17,23,0.72)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: "1.5px solid rgba(158,255,0,0.4)",
            boxShadow: "0 6px 18px -6px rgba(0,0,0,0.6), 0 0 18px -4px rgba(158,255,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span key={i} style={{ display: "flex", animation: s.anim }}>
              {s.icon}
            </span>
          </div>
        </div>

        <div key={i} style={{ animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
          <h1 style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: "clamp(26px, 7vw, 32px)", color: "var(--text-primary)",
            letterSpacing: "-0.02em", margin: "0 0 16px", maxWidth: "420px",
          }}>
            {s.title}
          </h1>
          <p style={{
            fontSize: "18px", lineHeight: 1.65, color: "var(--text-secondary)",
            margin: 0, maxWidth: "440px", fontWeight: 500,
          }}>
            {s.body}
          </p>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Paso ${idx + 1}`}
            style={{
              width: idx === i ? "26px" : "9px", height: "9px",
              borderRadius: "999px", cursor: "pointer", border: "none",
              background: idx === i ? "var(--lime)" : "var(--border-hover)",
              transition: "all 0.25s ease",
            }}
          />
        ))}
      </div>

      {/* Nav buttons */}
      <div style={{ display: "flex", gap: "12px", padding: "0 24px 36px", maxWidth: "520px", width: "100%", margin: "0 auto" }}>
        {i > 0 && (
          <button
            onClick={() => setI(i - 1)}
            style={{
              flex: 1, height: "56px", borderRadius: "14px",
              background: "var(--bg-card)", border: "1px solid var(--border-default)",
              cursor: "pointer", color: "var(--text-secondary)",
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "16px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <ArrowLeft size={18} /> Atrás
          </button>
        )}
        <button
          onClick={() => (last ? onFinish() : setI(i + 1))}
          className="gymos-btn gymos-btn-primary"
          style={{ flex: 2, height: "56px", fontSize: "17px", letterSpacing: "0.02em" }}
        >
          {last ? "¡Empezar!" : "Siguiente"} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
