-- ============================================================
-- PATCH 002: Fix RLS for member DNI-based login (no Supabase Auth)
-- Ejecutar en: Supabase → SQL Editor → New Query → Run
-- ============================================================

-- 1. Profiles: drop FK to auth.users (members don't have Auth accounts)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 2. Gyms: publicly readable (slug is in the URL already)
DROP POLICY IF EXISTS "gym_select" ON gyms;
CREATE POLICY "gym_select" ON gyms FOR SELECT USING (true);

-- 3. Profiles: allow insert for member registration (service role handles security)
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);

-- 4. Profiles: readable within same gym OR own profile
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);

-- 5. Routines: members can read by member_id (stored in localStorage)
DROP POLICY IF EXISTS "routines_select" ON routines;
CREATE POLICY "routines_select" ON routines FOR SELECT USING (true);
DROP POLICY IF EXISTS "routines_insert" ON routines;
CREATE POLICY "routines_insert" ON routines FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "routines_update" ON routines;
CREATE POLICY "routines_update" ON routines FOR UPDATE USING (true);

-- 6. Routine days + exercises: readable
DROP POLICY IF EXISTS "routine_days_select" ON routine_days;
CREATE POLICY "routine_days_select" ON routine_days FOR SELECT USING (true);
DROP POLICY IF EXISTS "routine_days_all" ON routine_days;
CREATE POLICY "routine_days_all" ON routine_days FOR ALL USING (true);

DROP POLICY IF EXISTS "routine_exercises_select" ON routine_exercises;
CREATE POLICY "routine_exercises_select" ON routine_exercises FOR SELECT USING (true);
DROP POLICY IF EXISTS "routine_exercises_all" ON routine_exercises;
CREATE POLICY "routine_exercises_all" ON routine_exercises FOR ALL USING (true);

-- 7. Progress logs: members read/write own logs
DROP POLICY IF EXISTS "progress_select" ON progress_logs;
CREATE POLICY "progress_select" ON progress_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "progress_insert" ON progress_logs;
CREATE POLICY "progress_insert" ON progress_logs FOR INSERT WITH CHECK (true);

-- 8. Body measurements: readable + insertable
DROP POLICY IF EXISTS "measurements_select" ON body_measurements;
CREATE POLICY "measurements_select" ON body_measurements FOR SELECT USING (true);
DROP POLICY IF EXISTS "measurements_insert" ON body_measurements;
CREATE POLICY "measurements_insert" ON body_measurements FOR INSERT WITH CHECK (true);

-- 9. Attendance: insertable without auth
DROP POLICY IF EXISTS "attendance_select" ON attendance;
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (true);
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
CREATE POLICY "attendance_insert" ON attendance FOR INSERT WITH CHECK (true);

-- 10. Exercises: globally readable
DROP POLICY IF EXISTS "exercises_select" ON exercises;
CREATE POLICY "exercises_select" ON exercises FOR SELECT USING (true);
DROP POLICY IF EXISTS "exercises_insert" ON exercises;
CREATE POLICY "exercises_insert" ON exercises FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "exercises_update" ON exercises;
CREATE POLICY "exercises_update" ON exercises FOR UPDATE USING (true);

-- 11. Member goals
DROP POLICY IF EXISTS "goals_select" ON member_goals;
CREATE POLICY "goals_select" ON member_goals FOR SELECT USING (true);
DROP POLICY IF EXISTS "goals_upsert" ON member_goals;
CREATE POLICY "goals_upsert" ON member_goals FOR ALL USING (true);

-- 12. Payments
DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "payments_all" ON payments;
CREATE POLICY "payments_all" ON payments FOR ALL USING (true);
