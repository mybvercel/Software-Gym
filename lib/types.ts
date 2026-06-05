// lib/types.ts
export type UserRole = "owner" | "trainer" | "member";
export type GoalType = "lose_weight" | "gain_muscle" | "tone" | "endurance" | "flexibility" | "general_health";
export type MuscleGroup = "chest" | "back" | "shoulders" | "arms" | "legs" | "glutes" | "core" | "cardio" | "full_body";
export type PaymentStatus = "pending" | "approved" | "rejected" | "refunded";

export interface Gym {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  city: string;
  logo_url?: string;
  is_active: boolean;
  subscription_plan: "starter" | "pro" | "enterprise";
  created_at: string;
}

export interface Profile {
  id: string;
  gym_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  birth_date?: string;
  gender?: "male" | "female" | "other";
  height_cm?: number;
  dni?: string;
  is_active: boolean;
  onboarding_completed: boolean;
  whatsapp_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  gym_id?: string;
  name: string;
  description?: string;
  muscle_group: MuscleGroup;
  equipment?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  video_url?: string;
  thumbnail_url?: string;
  instructions?: string[];
  is_active: boolean;
  created_at: string;
}

export interface RoutineExercise {
  id: string;
  exercise_id: string;
  exercise?: Exercise;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

export interface RoutineDay {
  id: string;
  day_number: number;
  name?: string;
  routine_exercises: RoutineExercise[];
}

export interface Routine {
  id: string;
  gym_id: string;
  member_id: string;
  trainer_id: string;
  name: string;
  description?: string;
  starts_at: string;
  ends_at?: string;
  is_active: boolean;
  routine_days?: RoutineDay[];
  member?: Profile;
  trainer?: Profile;
  created_at: string;
  updated_at: string;
}

export interface ProgressLog {
  id: string;
  member_id: string;
  routine_id?: string;
  exercise_id: string;
  exercise?: Exercise;
  logged_at: string;
  sets_completed?: number;
  reps_completed?: string;
  weight_kg?: number;
  duration_seconds?: number;
  perceived_effort?: number;
  notes?: string;
}

export interface BodyMeasurement {
  id: string;
  member_id: string;
  measured_at: string;
  weight_kg?: number;
  body_fat_pct?: number;
  muscle_mass_kg?: number;
  waist_cm?: number;
  chest_cm?: number;
  hip_cm?: number;
  arm_cm?: number;
  thigh_cm?: number;
  notes?: string;
  measured_by?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method?: string;
  period_from?: string;
  period_to?: string;
  paid_at?: string;
  created_at: string;
  member?: Profile;
}

export interface Attendance {
  id: string;
  gym_id: string;
  member_id: string;
  checked_in_at: string;
  method: "qr" | "manual" | "app";
  member?: Profile;
}

export interface Message {
  id: string;
  gym_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// UI State types
export interface DashboardStats {
  totalMembers: number;
  activeToday: number;
  inactiveLast7Days: number;
  pendingPayments: number;
}
