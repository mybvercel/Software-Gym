"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trainerLoginSchema, type TrainerLoginForm } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

interface Props {
  slug: string;
}

export default function TrainerLoginForm({ slug }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrainerLoginForm>({
    resolver: zodResolver(trainerLoginSchema),
  });

  const onSubmit = async (data: TrainerLoginForm) => {
    setIsLoading(true);
    setServerError(null);


    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user) {
      setServerError("Email o contraseña incorrectos.");
      setIsLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, gym_id, gyms(slug)")
      .eq("id", authData.user.id)
      .single();

    if (!profile || !["owner", "trainer"].includes(profile.role)) {
      await supabase.auth.signOut();
      setServerError("No tenés permisos de acceso como profesor.");
      setIsLoading(false);
      return;
    }

    router.push(`/gym/${slug}/dashboard/trainer`);
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

        {/* Email */}
        <Field label="Email" error={errors.email?.message}>
          <input
            id="trainer-email"
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            className="gymos-input"
            style={errors.email ? { borderColor: "var(--danger)" } : {}}
            {...register("email")}
          />
        </Field>

        {/* Contraseña */}
        <Field label="Contraseña" error={errors.password?.message}>
          <div style={{ position: "relative" }}>
            <input
              id="trainer-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="gymos-input"
              style={{
                paddingRight: "48px",
                ...(errors.password ? { borderColor: "var(--danger)" } : {}),
              }}
              {...register("password")}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                padding: "4px",
                borderRadius: "6px",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-secondary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        {/* Olvidé contraseña */}
        <div style={{ textAlign: "right", marginTop: "-8px" }}>
          <button
            type="button"
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "13px", color: "var(--lime)", fontWeight: 500,
              fontFamily: "inherit", padding: 0,
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {/* Error servidor */}
        {serverError && (
          <div style={{
            padding: "14px 16px",
            borderRadius: "10px",
            backgroundColor: "rgba(255,71,87,0.08)",
            border: "1px solid rgba(255,71,87,0.2)",
          }}>
            <p style={{ fontSize: "13px", color: "var(--danger)", margin: 0, fontWeight: 500 }}>
              ⚠️ {serverError}
            </p>
          </div>
        )}

        {/* Botón principal */}
        <button
          type="submit"
          disabled={isLoading}
          className="gymos-btn gymos-btn-primary gymos-btn-full"
          style={{ marginTop: "4px", letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          {isLoading ? (
            <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} />
          ) : (
            <>
              Ingresar al Panel
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        margin: "24px 0",
      }}>
        <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-subtle)" }} />
        <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>o</span>
        <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-subtle)" }} />
      </div>

      {/* Social buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <SocialButton
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          }
          label="Continuar con Google"
          onClick={() => {}}
        />
        <SocialButton
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-primary)" }}>
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
          }
          label="Continuar con Apple"
          onClick={() => {}}
        />
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <label className="gymos-label">{label}</label>
      {children}
      {error && <p className="gymos-error">{error}</p>}
    </div>
  );
}

function SocialButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="gymos-btn gymos-btn-secondary gymos-btn-full"
      style={{ justifyContent: "center", gap: "10px", fontSize: "14px", fontWeight: 500 }}
    >
      {icon}
      {label}
    </button>
  );
}
