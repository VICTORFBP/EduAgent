-- Add manual grading support to evaluaciones table
ALTER TABLE public.evaluaciones 
ADD COLUMN IF NOT EXISTS calificacion_manual boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS nota_ia numeric;

-- Backfill nota_ia with existing nota for backward compatibility
UPDATE public.evaluaciones 
SET nota_ia = nota 
WHERE nota IS NOT NULL AND calificacion_manual = false;
