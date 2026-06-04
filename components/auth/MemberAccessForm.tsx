"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { memberAccessSchema, type MemberAccessForm } from "@/lib/validations";
import { sanitizeDNI } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

export default function MemberAccessForm({ gymSlug }: { gymSlug: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<MemberAccessForm>({
    resolver: zodResolver(memberAccessSchema),
  });

  const onSubmit = async (data: MemberAccessForm) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const cleanDNI = sanitizeDNI(data.dni);

      const res = await fetch(`/api/gym/${gymSlug}/member-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: data.full_name, dni: cleanDNI }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Error al iniciar sesión.");
        return;
      }

      localStorage.setItem("gymos_member", JSON.stringify(json.profile));
      // Redirect to onboarding on first login, else straight to dashboard
      if (json.needsOnboarding) {
        router.push(`/gym/${gymSlug}/dashboard/member/onboarding`);
      } else {
        router.push(`/gym/${gymSlug}/dashboard/member`);
      }
    } catch {
      setServerError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

      <Field label="Nombre Completo" error={errors.full_name?.message}>
        <input
          type="text"
          autoComplete="name"
          className="gymos-input"
          style={errors.full_name ? { borderColor: "var(--danger)" } : {}}
          {...register("full_name")}
        />
      </Field>

      <Field label="DNI" error={errors.dni?.message}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="ej. 32123456"
          maxLength={8}
          className="gymos-input"
          style={errors.dni ? { borderColor: "var(--danger)" } : {}}
          {...register("dni", {
            onChange: (e) => {
              const clean = sanitizeDNI(e.target.value);
              setValue("dni", clean, { shouldValidate: false });
              e.target.value = clean;
            },
          })}
        />
      </Field>

      {serverError && (
        <div style={{ padding: "14px 16px", borderRadius: "10px", backgroundColor: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.2)" }}>
          <p style={{ fontSize: "13px", color: "var(--danger)", margin: 0, fontWeight: 500 }}>
            {serverError}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="gymos-btn gymos-btn-primary gymos-btn-full"
        style={{ marginTop: "4px", letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        {isLoading
          ? <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} />
          : <> Iniciar Sesión <ArrowRight size={18} /> </>
        }
      </button>
    </form>
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
