-- Migration: add_estudiante_fields
-- Date: 2026-07-10
-- Description: Add identificacion (document number) and fecha_nacimiento (birth date) to estudiantes table

ALTER TABLE estudiantes
  ADD COLUMN IF NOT EXISTS identificacion TEXT,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- Both columns are optional (nullable) to maintain backward compatibility.
