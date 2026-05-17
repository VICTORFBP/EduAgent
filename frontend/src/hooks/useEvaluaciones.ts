import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@clerk/nextjs"; // Wait, we are using Supabase Auth or Clerk? 
// Actually the project uses Supabase Auth via a custom provider. Let me check.

// RE-CHECKING AUTH:
// frontend/src/app/layout.tsx might show the auth provider.
// Based on previous logs, we are using Supabase Auth.

import { supabase } from "@/lib/supabase";

export interface Evaluacion {
  id: string;
  estudiante_id: string;
  docente_id: string;
  area: string;
  tipo: "estandarizada" | "abierta";
  archivo_path?: string;
  nota?: number;
  retroalimentacion?: string;
  procesado_correctamente: boolean;
  created_at: string;
}

export function useEvaluaciones() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluaciones = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const data = await apiGet("/evaluacion/", session.access_token);
      setEvaluaciones(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const processEvaluacion = async (formData: FormData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      // Custom apiPost for FormData
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/evaluacion/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al procesar la evaluación");
      }

      const result = await response.json();
      await fetchEvaluaciones(); // Refresh list
      return result;
    } catch (err: any) {
      throw err;
    }
  };

  useEffect(() => {
    fetchEvaluaciones();
  }, []);

  return {
    evaluaciones,
    isLoading,
    error,
    processEvaluacion,
    refresh: fetchEvaluaciones,
  };
}
