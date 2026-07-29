/**
 * useEvaluaciones — hook for listing evaluations and submitting new ones.
 * Supports auto-polling: when there are pending evaluations (procesado_correctamente=false),
 * it re-fetches every POLL_INTERVAL_MS until all are resolved.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiGet } from "@/lib/api";
import type { Evaluacion } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 5000; // 5 s

export function useEvaluaciones() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchEvaluaciones = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const data = await apiGet<Evaluacion[]>("/evaluacion/", session.access_token);
      setEvaluaciones(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPending = evaluaciones.some((e) => !e.procesado_correctamente && e.nota === null && !e.error_ocr);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (hasPending) {
      timer = setInterval(() => {
        fetchEvaluaciones(true); // quiet refresh
      }, POLL_INTERVAL_MS);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [hasPending, fetchEvaluaciones]);

  useEffect(() => {
    fetchEvaluaciones();
  }, [fetchEvaluaciones]);

  /** Submit a new evaluation via FormData. Returns backend record immediately. */
  const processEvaluacion = useCallback(async (formData: FormData) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa");

    const response = await fetch(`${API}/evaluacion/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: response.statusText }));
      const detailMsg = typeof errData.detail === "object" ? JSON.stringify(errData.detail) : errData.detail;
      throw new Error(detailMsg || "Error al procesar la evaluación");
    }

    const result = await response.json();

    // Optimistically add to list. The useEffect will automatically start polling.
    setEvaluaciones((prev) => [result.data, ...prev].filter(Boolean));

    return result;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const processEvaluacionLote = useCallback(async (formData: FormData) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa");

    const response = await fetch(`${API}/evaluacion/lote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: response.statusText }));
      const detailMsg = typeof errData.detail === "object" ? JSON.stringify(errData.detail) : errData.detail;
      throw new Error(detailMsg || "Error al procesar el lote de evaluaciones");
    }

    const result = await response.json();
    
    fetchEvaluaciones(true); // Fetch to get the new pending evaluations. The useEffect will handle polling.

    return result;
  }, [fetchEvaluaciones]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteEvaluacion = useCallback(async (evaluacionId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa");

    const response = await fetch(`${API}/evaluacion/${evaluacionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errData.detail || "Error al eliminar la evaluación");
    }

    setEvaluaciones((prev) => prev.filter((e) => e.id !== evaluacionId));
  }, []);

  const retryEvaluacion = useCallback(async (evaluacionId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa");

    const response = await fetch(`${API}/evaluacion/${evaluacionId}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errData.detail || "Error al reintentar la evaluación");
    }

    setEvaluaciones((prev) =>
      prev.map((e) =>
        e.id === evaluacionId ? { ...e, procesado_correctamente: false, error_ocr: null } : e
      )
    );
  }, []);

  const updateEvaluacionPartial = useCallback(async (evaluacionId: string, data: { estudiante_id: string, estudiante_nombre: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa");

    const response = await fetch(`${API}/evaluacion/${evaluacionId}`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}` 
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errData.detail || "Error al actualizar la evaluación");
    }

    const result = await response.json();
    setEvaluaciones((prev) =>
      prev.map((e) => (e.id === evaluacionId ? { ...e, ...result } : e))
    );
    return result;
  }, []);

  const calificarManual = useCallback(async (evaluacionId: string, nota: number, retroalimentacion: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa");

    const response = await fetch(`${API}/evaluacion/${evaluacionId}/calificar`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}` 
      },
      body: JSON.stringify({ nota, retroalimentacion })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errData.detail || "Error al calificar manualmente");
    }

    const result = await response.json();
    setEvaluaciones((prev) =>
      prev.map((e) => (e.id === evaluacionId ? { ...e, ...result } : e))
    );
    return result;
  }, []);

  const skipIA = useCallback(async (evaluacionId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa");

    const response = await fetch(`${API}/evaluacion/${evaluacionId}/skip-ia`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errData.detail || "Error al omitir la IA");
    }

    const result = await response.json();
    setEvaluaciones((prev) =>
      prev.map((e) => (e.id === evaluacionId ? { ...e, ...result } : e))
    );
    return result;
  }, []);

  return {
    evaluaciones,
    isLoading,
    error,
    processEvaluacion,
    processEvaluacionLote,
    updateEvaluacionPartial,
    deleteEvaluacion,
    retryEvaluacion,
    calificarManual,
    skipIA,
    refresh: () => fetchEvaluaciones(),
  };
}
