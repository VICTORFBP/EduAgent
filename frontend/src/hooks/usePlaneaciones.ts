import { useState, useCallback } from "react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export function usePlaneaciones() {
  const [planeaciones, setPlaneaciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchPlaneaciones = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      const data = await apiGet<any[]>("/planeacion/", token);
      setPlaneaciones(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar planeaciones");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const fetchPlaneacion = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      const data = await apiGet<any>(`/planeacion/${id}`, token);
      return data;
    } catch (err: any) {
      setError(err.message || "Error al cargar la planeación");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const generatePlaneacion = async (req: { 
    area: string, 
    grados: number[], 
    tema: string, 
    duracion: number, 
    recursos: string,
    parent_plan_id?: string,
    feedback?: string
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      const result = await apiPost<any>("/planeacion/", req, token);
      setPlaneaciones((prev) => [result, ...prev]);
      return result;
    } catch (err: any) {
      setError(err.message || "Error al generar planeación");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const validatePlaneacion = async (id: string, validada: boolean, correcciones?: string, contenidoGenerado?: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      const result = await apiPatch<any>(`/planeacion/${id}`, { 
        validada_docente: validada, 
        correcciones,
        contenido_generado: contenidoGenerado
      }, token);
      setPlaneaciones((prev) => prev.map((p) => (p.id === id ? result : p)));
      return result;
    } catch (err: any) {
      setError(err.message || "Error al validar planeación");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const generateActividad = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      const result = await apiPost<any>(`/planeacion/${id}/actividad`, {}, token);
      return result;
    } catch (err: any) {
      setError(err.message || "Error al generar actividad");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    planeaciones,
    isLoading,
    error,
    fetchPlaneaciones,
    fetchPlaneacion,
    generatePlaneacion,
    validatePlaneacion,
    generateActividad,
  };
}

