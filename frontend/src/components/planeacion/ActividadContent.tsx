"use client";

import { useMemo } from "react";
import { ActividadHtml } from "@/components/planeacion/ActividadHtml";
import {
  ActividadMarkdown,
  type ActividadMarkdownVariant,
} from "@/components/planeacion/ActividadMarkdown";
import { prepareActividadContent } from "@/lib/actividad-content";

export interface ActividadContentProps {
  content: unknown;
  variant?: ActividadMarkdownVariant;
  className?: string;
}

/** Renders activity body as sanitized HTML or Markdown+KaTeX. */
export function ActividadContent({
  content,
  variant = "document",
  className = "",
}: ActividadContentProps) {
  const prepared = useMemo(() => prepareActividadContent(content), [content]);

  if (!prepared.content) return null;

  if (prepared.format === "html") {
    return <ActividadHtml content={prepared.content} className={className} />;
  }

  return (
    <ActividadMarkdown
      content={prepared.content}
      variant={variant}
      className={className}
    />
  );
}
