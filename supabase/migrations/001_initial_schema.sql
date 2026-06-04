-- ============================================================
-- GymOS — Migración inicial completa
-- Ejecutar en: Supabase → SQL Editor → New Query → Run
-- ============================================================

-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- GYMS
-- ============================================================
CREATE TABLE IF NOT EXISTS gyms (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  slug                  TEXT UNIQUE NOT NULL,
  email                 TEXT,
  phone                 TEXT,
  address               TEXT,
  city                  TEXT DEFAULT 'Córdoba',
  logo_url              TEXT,
  is_active             BOOLEAN DEFAULT true,
  subscription_plan     TEXT DEFAULT 'starter',
  subscription_expires_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gyms_slug ON gyms(slug);

-- ============================================================
-- PROFILES (extiende auth.users de Supabase)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id                UUID REFERENCES gyms(id),
  role                  TEXT NOT NULL CHECK (role IN ('owner','trainer','member')),
  full_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT,
  avatar_url            TEXT,
  birth_date            DATE,
  gender                TEXT CHECK (gender IN ('male','female','other')),
  dni                   TEXT,
  is_active             BOOLEAN DEFAULT true,
  onboarding_completed  BOOLEAN DEFAULT false,
  whatsapp_notifications BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_gym_id ON profiles(gym_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role   ON profiles(role);
-- Unicidad del DNI por gimnasio (no global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_gym_dni ON profiles(gym_id, dni) WHERE dni IS NOT NULL;

-- ============================================================
-- MEMBER_GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS member_goals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal              TEXT CHECK (goal IN ('lose_weight','gain_muscle','tone','endurance','general_health')),
  experience_level  TEXT CHECK (experience_level IN ('beginner','intermediate','advanced')),
  days_per_week     INTEGER,
  injuries          TEXT,
  uses_supplements  BOOLEAN DEFAULT false,
  supplements_detail TEXT,
  objectives_detail TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id)
);

-- ============================================================
-- EXERCISES
-- ============================================================
CREATE TABLE IF NOT EXISTS exercises (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id        UUID REFERENCES gyms(id),
  name          TEXT NOT NULL,
  description   TEXT,
  muscle_group  TEXT NOT NULL CHECK (muscle_group IN ('chest','back','shoulders','arms','legs','glutes','core','cardio','full_body')),
  equipment     TEXT CHECK (equipment IN ('barbell','dumbbell','machine','cable','bodyweight','bands','kettlebell','other')),
  difficulty    TEXT CHECK (difficulty IN ('beginner','intermediate','advanced')),
  video_url     TEXT,
  thumbnail_url TEXT,
  instructions  TEXT[],
  is_active     BOOLEAN DEFAULT true,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_gym_id       ON exercises(gym_id);

-- ============================================================
-- ROUTINES
-- ============================================================
CREATE TABLE IF NOT EXISTS routines (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id      UUID NOT NULL REFERENCES gyms(id),
  member_id   UUID NOT NULL REFERENCES profiles(id),
  trainer_id  UUID NOT NULL REFERENCES profiles(id),
  name        TEXT NOT NULL,
  description TEXT,
  starts_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_at     DATE,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_routines_member_id  ON routines(member_id);
CREATE INDEX IF NOT EXISTS idx_routines_is_active  ON routines(is_active);

-- ============================================================
-- ROUTINE_DAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS routine_days (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id  UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  day_number  INTEGER NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROUTINE_EXERCISES
-- ============================================================
CREATE TABLE IF NOT EXISTS routine_exercises (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_day_id  UUID NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES exercises(id),
  order_index     INTEGER NOT NULL DEFAULT 0,
  sets            INTEGER NOT NULL DEFAULT 3,
  reps            TEXT NOT NULL DEFAULT '10',
  rest_seconds    INTEGER DEFAULT 60,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROGRESS_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS progress_logs (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id            UUID NOT NULL REFERENCES profiles(id),
  routine_id           UUID REFERENCES routines(id),
  exercise_id          UUID NOT NULL REFERENCES exercises(id),
  logged_at            TIMESTAMPTZ DEFAULT NOW(),
  sets_completed       INTEGER,
  reps_completed       TEXT,
  weight_kg            NUMERIC(6,2),
  duration_seconds     INTEGER,
  perceived_effort     INTEGER CHECK (perceived_effort BETWEEN 1 AND 10),
  notes                TEXT
);
CREATE INDEX IF NOT EXISTS idx_progress_member   ON progress_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_progress_exercise ON progress_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_progress_logged   ON progress_logs(logged_at);

-- ============================================================
-- BODY_MEASUREMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS body_measurements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id       UUID NOT NULL REFERENCES profiles(id),
  measured_at     TIMESTAMPTZ DEFAULT NOW(),
  weight_kg       NUMERIC(5,2),
  body_fat_pct    NUMERIC(4,2),
  muscle_mass_kg  NUMERIC(5,2),
  waist_cm        NUMERIC(5,2),
  chest_cm        NUMERIC(5,2),
  hip_cm          NUMERIC(5,2),
  arm_cm          NUMERIC(5,2),
  thigh_cm        NUMERIC(5,2),
  notes           TEXT,
  measured_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_measurements_member ON body_measurements(member_id);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id        UUID NOT NULL REFERENCES gyms(id),
  member_id     UUID NOT NULL REFERENCES profiles(id),
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  method        TEXT DEFAULT 'app' CHECK (method IN ('qr','manual','app'))
);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_gym    ON attendance(gym_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date   ON attendance(checked_in_at);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id                   UUID NOT NULL REFERENCES gyms(id),
  member_id                UUID NOT NULL REFERENCES profiles(id),
  amount                   NUMERIC(10,2) NOT NULL,
  currency                 TEXT DEFAULT 'ARS',
  status                   TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','refunded')),
  payment_method           TEXT,
  mercadopago_payment_id   TEXT,
  period_from              DATE,
  period_to                DATE,
  paid_at                  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================
-- MESSAGES (chat alumno-profe)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id      UUID NOT NULL REFERENCES gyms(id),
  sender_id   UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id),
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT false,
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read);

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_gyms
  BEFORE UPDATE ON gyms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_routines
  BEFORE UPDATE ON routines FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: crear profile automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms               ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_days       ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_goals       ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION get_user_gym_id()
RETURNS UUID AS $$
  SELECT gym_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Policies: gyms
CREATE POLICY "gym_select" ON gyms FOR SELECT USING (id = get_user_gym_id());

-- Policies: profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (gym_id = get_user_gym_id() OR id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Policies: exercises (globales son visibles para todos)
CREATE POLICY "exercises_select" ON exercises FOR SELECT USING (gym_id IS NULL OR gym_id = get_user_gym_id());
CREATE POLICY "exercises_insert" ON exercises FOR INSERT WITH CHECK (get_user_role() IN ('owner','trainer'));
CREATE POLICY "exercises_update" ON exercises FOR UPDATE USING (get_user_role() IN ('owner','trainer'));

-- Policies: routines
CREATE POLICY "routines_select" ON routines FOR SELECT USING (member_id = auth.uid() OR trainer_id = auth.uid() OR get_user_role() IN ('owner','trainer'));
CREATE POLICY "routines_insert" ON routines FOR INSERT WITH CHECK (get_user_role() IN ('owner','trainer'));
CREATE POLICY "routines_update" ON routines FOR UPDATE USING (trainer_id = auth.uid() OR get_user_role() = 'owner');

-- Policies: routine_days y routine_exercises
CREATE POLICY "routine_days_select" ON routine_days FOR SELECT USING (
  routine_id IN (SELECT id FROM routines WHERE member_id = auth.uid() OR trainer_id = auth.uid() OR get_user_role() IN ('owner','trainer'))
);
CREATE POLICY "routine_days_all"    ON routine_days FOR ALL USING (get_user_role() IN ('owner','trainer'));
CREATE POLICY "routine_exercises_select" ON routine_exercises FOR SELECT USING (
  routine_day_id IN (SELECT id FROM routine_days)
);
CREATE POLICY "routine_exercises_all" ON routine_exercises FOR ALL USING (get_user_role() IN ('owner','trainer'));

-- Policies: progress_logs
CREATE POLICY "progress_select" ON progress_logs FOR SELECT USING (member_id = auth.uid() OR get_user_role() IN ('owner','trainer'));
CREATE POLICY "progress_insert" ON progress_logs FOR INSERT WITH CHECK (member_id = auth.uid());

-- Policies: body_measurements
CREATE POLICY "measurements_select" ON body_measurements FOR SELECT USING (member_id = auth.uid() OR get_user_role() IN ('owner','trainer'));
CREATE POLICY "measurements_insert" ON body_measurements FOR INSERT WITH CHECK (member_id = auth.uid() OR get_user_role() IN ('owner','trainer'));

-- Policies: attendance
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (member_id = auth.uid() OR get_user_role() IN ('owner','trainer'));
CREATE POLICY "attendance_insert" ON attendance FOR INSERT WITH CHECK (gym_id = get_user_gym_id());

-- Policies: payments
CREATE POLICY "payments_select" ON payments FOR SELECT USING (member_id = auth.uid() OR get_user_role() IN ('owner','trainer'));
CREATE POLICY "payments_all"    ON payments FOR ALL USING (get_user_role() IN ('owner','trainer'));

-- Policies: messages
CREATE POLICY "messages_select" ON messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Policies: notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Policies: member_goals
CREATE POLICY "goals_select" ON member_goals FOR SELECT USING (member_id = auth.uid() OR get_user_role() IN ('owner','trainer'));
CREATE POLICY "goals_upsert" ON member_goals FOR ALL USING (member_id = auth.uid() OR get_user_role() IN ('owner','trainer'));
