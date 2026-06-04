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
