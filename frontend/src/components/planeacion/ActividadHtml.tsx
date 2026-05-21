"use client";

import { useEffect, useMemo, useRef } from "react";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";
import {
  prepareActividadContent,
  sanitizeActividadHtml,
} from "@/lib/actividad-content";
import { ACTIVIDAD_TALLER_CSS } from "@/lib/actividad-taller-styles";

const KATEX_OPTIONS = {
  delimiters: [
    { left: "$$", right: "$$", display: true },
    { left: "$", right: "$", display: false },
  ],
  throwOnError: false,
};

export interface ActividadHtmlProps {
  content: unknown;
  className?: string;
}

export function ActividadHtml({ content, className = "" }: ActividadHtmlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prepared = useMemo(() => prepareActividadContent(content), [content]);
  const safeHtml = useMemo(
    () =>
      prepared.format === "html"
        ? sanitizeActividadHtml(prepared.content)
        : "",
    [prepared]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !safeHtml) return;
    renderMathInElement(el, KATEX_OPTIONS);
  }, [safeHtml]);

  if (!safeHtml) return null;

  return (
    <>
      <style>{ACTIVIDAD_TALLER_CSS}</style>
      <div
        ref={containerRef}
        className={`actividad-taller [&_.katex]:text-[1.05em] ${className}`}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </>
  );
}
