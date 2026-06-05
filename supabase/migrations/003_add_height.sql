-- ============================================================
-- PATCH 003: Altura del alumno
-- Ejecutar en: Supabase → SQL Editor → New Query → Run
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1);
