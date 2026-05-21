"use client";

import { ActividadContent } from "@/components/planeacion/ActividadContent";
import { getGradeContent } from "@/lib/actividad-markdown";

export interface ActividadDocumentProps {
  titulo: string;
  area: string;
  tema: string;
  grado: number;
  instrucciones?: string;
  contenidoGrado: string;
  showGradeBadge?: boolean;
}

export function ActividadDocument({
  titulo,
  area,
  tema,
  grado,
  instrucciones,
  contenidoGrado,
  showGradeBadge = true,
}: ActividadDocumentProps) {
  const hasInstrucciones =
    instrucciones != null && String(instrucciones).trim() !== "";

  return (
    <div
      className="bg-white text-black p-8 sm:p-12 shadow-2xl w-full max-w-[800px] min-h-[1056px] font-serif"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <h1 className="text-[22px] font-bold border-b-2 border-gray-300 pb-2 mb-6 text-center text-gray-900">
        {titulo}
      </h1>

      <div className="grid grid-cols-2 gap-3 border border-gray-300 p-4 rounded-lg mb-8 text-sm">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-500 text-[11px] uppercase tracking-wide">
            Estudiante
          </span>
          <span className="border-b border-gray-400 min-h-[1.25rem]">&nbsp;</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-500 text-[11px] uppercase tracking-wide">
            Grado
          </span>
          <span className="text-gray-900 font-medium">{grado}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-500 text-[11px] uppercase tracking-wide">
            Fecha
          </span>
          <span className="border-b border-gray-400 min-h-[1.25rem]">&nbsp;</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-500 text-[11px] uppercase tracking-wide">
            Área
          </span>
          <span className="text-gray-900">{area}</span>
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <span className="font-semibold text-gray-500 text-[11px] uppercase tracking-wide">
            Tema
          </span>
          <span className="text-gray-900">{tema}</span>
        </div>
      </div>

      {hasInstrucciones ? (
        <div className="italic text-gray-700 mb-8 text-[14.5px] border-b border-gray-100 pb-6">
          <ActividadContent content={instrucciones} variant="document" />
        </div>
      ) : null}

      {showGradeBadge ? (
        <div className="inline-block px-3 py-1 bg-gray-100 text-gray-800 font-bold text-xs uppercase rounded border border-gray-200 mb-4">
          Grado {grado}
        </div>
      ) : null}

      <div className="text-[14.5px] text-gray-900 leading-relaxed">
        <ActividadContent content={contenidoGrado} variant="document" />
      </div>
    </div>
  );
}

export function getActividadGradesWithContent(
  plan: {
    grados?: number[];
    actividad_generada?: { contenido_grados?: Record<string | number, string> };
  }
): number[] {
  const grados = plan.grados ?? [];
  return grados.filter(
    (g) => getGradeContent(plan.actividad_generada?.contenido_grados, g) != null
  );
}
