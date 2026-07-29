import { useState, useCallback } from "react";
import { apiGet, apiUpload, apiDelete, apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export function useDocumentos() {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchDocumentos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      const data = await apiGet<any[]>("/documentos/", token);
      setDocumentos(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar documentos");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const uploadDocumento = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      const result = await apiUpload<any>("/documentos/", formData, token);
      setDocumentos((prev) => [result, ...prev]);
      return result;
    } catch (err: any) {
      setError(err.message || "Error al subir documento");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDocumento = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      await apiDelete(`/documentos/${id}`, token);
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      setError(err.message || "Error al eliminar documento");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const reprocesarDocumento = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      await apiPost(`/documentos/${id}/reprocesar`, {}, token);
      return true;
    } catch (err: any) {
      setError(err.message || "Error al reprocesar documento");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocumentosReferencia = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || undefined;
      return await apiGet<any[]>("/documentos/referencia", token);
    } catch (err: any) {
      return [];
    }
  };

  return {
    documentos,
    isLoading,
    error,
    fetchDocumentos,
    uploadDocumento,
    deleteDocumento,
    reprocesarDocumento,
    fetchDocumentosReferencia,
  };
}
