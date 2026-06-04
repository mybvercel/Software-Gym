import { z } from "zod";

export const memberAccessSchema = z.object({
  full_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "Nombre demasiado largo")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, "Solo letras y espacios"),
  dni: z
    .string()
    .min(7, "El DNI debe tener al menos 7 dígitos")
    .max(8, "El DNI no puede tener más de 8 dígitos")
    .regex(/^\d+$/, "El DNI solo puede contener números"),
});

export const trainerLoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const progressLogSchema = z.object({
  sets_completed: z.number().min(1).max(20),
  reps_completed: z.string().min(1, "Ingresá las repeticiones"),
  weight_kg: z.number().min(0).max(999).optional(),
  perceived_effort: z.number().min(1).max(10).optional(),
  notes: z.string().max(200).optional(),
});

export const bodyMeasurementSchema = z.object({
  weight_kg: z.number().min(20).max(300).optional(),
  body_fat_pct: z.number().min(1).max(60).optional(),
  waist_cm: z.number().min(40).max(200).optional(),
  chest_cm: z.number().min(50).max(200).optional(),
  arm_cm: z.number().min(15).max(80).optional(),
  hip_cm: z.number().min(50).max(200).optional(),
  thigh_cm: z.number().min(20).max(120).optional(),
  notes: z.string().max(300).optional(),
});

export const healthProfileSchema = z.object({
  goal: z.enum(["lose_weight", "gain_muscle", "tone", "endurance", "general_health"]),
  experience_level: z.enum(["beginner", "intermediate", "advanced"]),
  days_per_week: z.number().min(1).max(6),
  injuries: z.string().max(500).optional(),
  uses_supplements: z.boolean(),
  supplements_detail: z.string().max(300).optional(),
  objectives_detail: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.uses_supplements && !data.supplements_detail?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Describí qué suplemento o medicación usás",
      path: ["supplements_detail"],
    });
  }
});

export type HealthProfileForm = z.infer<typeof healthProfileSchema>;

export type MemberAccessForm = z.infer<typeof memberAccessSchema>;
export type TrainerLoginForm = z.infer<typeof trainerLoginSchema>;
export type ProgressLogForm = z.infer<typeof progressLogSchema>;
export type BodyMeasurementForm = z.infer<typeof bodyMeasurementSchema>;
