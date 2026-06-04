"use client";

import { useState } from "react";
import { X, UserPlus, AlertTriangle, Check, Loader2 } from "lucide-react";

const T = {
  navy: "#0D1B2A", green: "#22C55E", greenDim: "rgba(34,197,94,0.10)",
  greenBorder: "rgba(34,197,94,0.28)", card: "#FFFFFF", bg: "#F1F5F9",
  border: "#E2E8F0", text: "#0F172A", muted: "#64748B", light: "#94A3B8",
  red: "#EF4444", redDim: "rgba(239,68,68,0.10)", orange: "#F97316",
  font: "'Space Grotesk', system-ui, sans-serif",
};

interface Props {
  gymSlug: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewMemberModal({ gymSlug, onClose, onCreated }: Props) {
  const [fullName,  setFullName]  = useState("");
  const [dni,       setDni]       = useState("");
  const [phone,     setPhone]     = useState("");
  const [subDays,   setSubDays]   = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);

  const sanitizeDNI = (v: string) => v.replace(/\D/g, "").slice(0, 8);

  const handleSubmit = async () => {
    if (!fullName.trim()) { setError("El nombre es obligatorio."); return; }
    if (dni.length < 7)   { setError("El DNI debe tener al menos 7 dígitos."); return; }

    setIsLoading(true);
    setError(null);

    const res = await fetch(`/api/gym/${gymSlug}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName.trim(), dni, phone: phone || undefined }),
    });

    const json = await res.json();
    setIsLoading(false);

    if (!res.ok || json.errors?.length) {
      setError(json.error ?? "No se pudo crear el alumno. Verificá los datos.");
      return;
    }
    if (json.skipped?.length) {
      setError(`Ya existe un alumno con DNI ${dni} en este gimnasio.`);
      return;
    }

    setSuccess(true);
    setTimeout(() => { onCreated(); onClose(); }, 1400);
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{
        width: "100%", maxWidth: "460px",
        background: T.card, borderRadius: "20px",
        border: `1px solid ${T.border}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          background: T.navy, padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: T.greenDim, border: `1px solid ${T.greenBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <UserPlus size={18} color={T.green} />
            </div>
            <div>
              <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: "16px", color: "#fff", margin: 0 }}>
                Nuevo alumno
              </p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", margin: 0 }}>
                Los datos deben ser exactamente los que usará para ingresar
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {/* Warning */}
        <div style={{
          margin: "20px 24px 0",
          padding: "12px 14px", borderRadius: "10px",
          background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)",
          display: "flex", gap: "10px", alignItems: "flex-start",
        }}>
          <AlertTriangle size={16} color={T.orange} style={{ flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "13px", color: T.orange, margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
            <strong>Importante:</strong> el nombre y DNI deben ser exactamente como los ingresará el alumno al acceder a la app. Si hay diferencias, no podrá entrar.
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>

          <FormField label="Nombre completo *">
            <input
              type="text"
              placeholder="Ej: María González"
              autoFocus
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={inputStyle}
            />
          </FormField>

          <FormField label="DNI (sin puntos) *">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ej: 38456789"
              maxLength={8}
              value={dni}
              onChange={e => setDni(sanitizeDNI(e.target.value))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={inputStyle}
            />
          </FormField>

          <FormField label="Teléfono / WhatsApp (opcional)">
            <input
              type="tel"
              placeholder="Ej: 3516789012"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={inputStyle}
            />
          </FormField>

          <FormField label="Duración de la cuota">
            <div style={{ display: "flex", gap: "8px" }}>
              {[30, 60, 90].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSubDays(d)}
                  style={{
                    flex: 1, height: "40px", borderRadius: "8px", cursor: "pointer",
                    border: `1.5px solid ${subDays === d ? T.green : T.border}`,
                    background: subDays === d ? T.greenDim : T.bg,
                    fontFamily: T.font, fontWeight: 700, fontSize: "13px",
                    color: subDays === d ? T.green : T.muted,
                  }}
                >
                  {d} días
                </button>
              ))}
            </div>
          </FormField>

          {error && (
            <div style={{
              padding: "12px 14px", borderRadius: "10px",
              background: T.redDim, border: "1px solid rgba(239,68,68,0.25)",
            }}>
              <p style={{ fontSize: "13px", color: T.red, margin: 0, fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, height: "46px", borderRadius: "10px",
                background: T.bg, border: `1px solid ${T.border}`,
                cursor: "pointer", fontFamily: T.font, fontWeight: 600,
                fontSize: "14px", color: T.muted,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || success}
              style={{
                flex: 2, height: "46px", borderRadius: "10px",
                background: success ? T.green : T.green,
                border: "none", cursor: isLoading || success ? "default" : "pointer",
                fontFamily: T.font, fontWeight: 700, fontSize: "14px", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} />
               : success  ? <><Check size={16} strokeWidth={3} /> Alumno creado</>
               : <>Crear alumno</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: "44px", padding: "0 14px",
  border: "1.5px solid #E2E8F0", borderRadius: "10px",
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  fontSize: "14px", color: "#0F172A", outline: "none",
  background: "#F8FAFC", boxSizing: "border-box",
};

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: "12px", fontWeight: 700,
        color: "#64748B", marginBottom: "6px",
        textTransform: "uppercase", letterSpacing: "0.04em",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}
