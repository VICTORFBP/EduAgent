import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export interface Estudiante {
  id: string;
  nombre: string;
  grado: number;
}

export function useEstudiantes() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchEstudiantes = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const data = await apiGet("/dashboard/estudiantes", session.access_token);
      setEstudiantes(data as Estudiante[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEstudiantes();
  }, []);

  return {
    estudiantes,
    isLoading,
    error,
    refresh: fetchEstudiantes,
  };
}
