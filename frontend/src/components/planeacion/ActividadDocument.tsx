"use client";

import type { HTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  getGradeContent,
  normalizeActividadMarkdown,
} from "@/lib/actividad-markdown";

const markdownComponents = {
  h1: ({ ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-xl font-bold mt-6 mb-3 text-black" {...props} />
  ),
  h2: ({ ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="text-lg font-semibold mt-5 mb-2 text-gray-800 border-b border-gray-100 pb-1"
      {...props}
    />
  ),
  h3: ({ ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-base font-medium mt-4 mb-2 text-gray-800" {...props} />
  ),
  p: ({ ...props }: HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 last:mb-0 text-[13.5px] text-gray-800 leading-relaxed" {...props} />
  ),
  ul: ({ ...props }: HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc pl-6 mb-4 space-y-1 text-gray-800" {...props} />
  ),
  ol: ({ ...props }: HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2 text-gray-800" {...props} />
  ),
  li: ({ ...props }: HTMLAttributes<HTMLLIElement>) => (
    <li className="my-1 text-[13.5px]" {...props} />
  ),
  code: ({ ...props }: HTMLAttributes<HTMLElement>) => (
    <code
      className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800"
      {...props}
    />
  ),
  pre: ({ ...props }: HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto my-4 text-sm font-mono text-gray-800"
      {...props}
    />
  ),
  blockquote: ({ ...props }: HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600"
      {...props}
    />
  ),
  table: ({ ...props }: HTMLAttributes<HTMLTableElement>) => (
    <table className="w-full border-collapse border border-gray-400 my-4" {...props} />
  ),
  th: ({ ...props }: HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="border border-gray-400 bg-gray-100 p-3 text-left font-semibold text-xs text-gray-800"
      {...props}
    />
  ),
  td: ({ ...props }: HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className="border border-gray-400 p-3 text-left text-[13.5px] text-gray-900 leading-normal min-h-[80px] align-top"
      {...props}
    />
  ),
};

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
  const instruccionesMd = instrucciones
    ? normalizeActividadMarkdown(instrucciones)
    : "";
  const contenidoMd = normalizeActividadMarkdown(contenidoGrado);

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

      {instruccionesMd ? (
        <div className="italic text-gray-700 mb-8 text-[14.5px] border-b border-gray-100 pb-6">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {instruccionesMd}
          </ReactMarkdown>
        </div>
      ) : null}

      {showGradeBadge ? (
        <div className="inline-block px-3 py-1 bg-gray-100 text-gray-800 font-bold text-xs uppercase rounded border border-gray-200 mb-4">
          Grado {grado}
        </div>
      ) : null}

      <div className="text-[14.5px] text-gray-900 leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={markdownComponents}
        >
          {contenidoMd}
        </ReactMarkdown>
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
