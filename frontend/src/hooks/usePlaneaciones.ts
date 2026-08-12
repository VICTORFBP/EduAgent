import { useState, useCallback } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

let cachedPlaneaciones: any[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30000;

export function usePlaneaciones() {
  const [planeaciones, setPlaneaciones] = useState<any[]>(cachedPlaneaciones || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchPlaneaciones = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedPlaneaciones && (now - lastFetchTime < CACHE_TTL_MS)) {
      setPlaneaciones(cachedPlaneaciones);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      const data = await apiGet<any[]>("/planeacion/", token);
      cachedPlaneaciones = data;
      lastFetchTime = Date.now();
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
    duracion?: number, 
    recursos: string,
    tipoActividad?: string,
    parent_plan_id?: string,
    feedback?: string,
    documentoIds?: string[],
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      const payload = {
        area: req.area,
        grados: req.grados,
        tema: req.tema,
        duracion: req.duracion ?? 2,
        recursos: req.recursos,
        tipo_actividad: req.tipoActividad,
        parent_plan_id: req.parent_plan_id,
        feedback: req.feedback,
        documento_ids: req.documentoIds?.length ? req.documentoIds : undefined,
      };
      const result = await apiPost<any>("/planeacion/", payload, token);
      setPlaneaciones((prev) => {
        const newData = [result, ...prev];
        cachedPlaneaciones = newData;
        return newData;
      });
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
      setPlaneaciones((prev) => {
        const newData = prev.map((p) => (p.id === id ? result : p));
        cachedPlaneaciones = newData;
        return newData;
      });
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
      
      if (result.auto_approved) {
        setPlaneaciones((prev) => {
          const newData = prev.map((p) => (p.id === id ? { ...p, validada_docente: true } : p));
          cachedPlaneaciones = newData;
          return newData;
        });
      }

      return result;
    } catch (err: any) {
      setError(err.message || "Error al generar actividad");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deletePlaneacion = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      await apiDelete(`/planeacion/${id}`, token);
      setPlaneaciones((prev) => {
        const newData = prev.filter((p) => p.id !== id);
        cachedPlaneaciones = newData;
        return newData;
      });
    } catch (err: any) {
      setError(err.message || "Error al eliminar planeación");
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
    deletePlaneacion,
  };
}

