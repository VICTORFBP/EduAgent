"use client";

import type { HTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { normalizeActividadMarkdown } from "@/lib/actividad-markdown";

export type ActividadMarkdownVariant = "document" | "teacher" | "screen";

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];

function buildComponents(variant: ActividadMarkdownVariant) {
  if (variant === "document") {
    return {
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
  }

  const accent =
    variant === "teacher" ? "text-emerald-400" : "text-primary";
  const codeAccent =
    variant === "teacher" ? "text-emerald-400" : "text-primary";

  return {
    h1: ({ ...props }: HTMLAttributes<HTMLHeadingElement>) => (
      <h1 className={`text-lg font-bold mt-4 mb-2 ${accent}`} {...props} />
    ),
    h2: ({ ...props }: HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className="text-base font-semibold mt-3 mb-2 text-foreground" {...props} />
    ),
    h3: ({ ...props }: HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="text-sm font-medium mt-2 mb-1 text-foreground/90" {...props} />
    ),
    p: ({ ...props }: HTMLAttributes<HTMLParagraphElement>) => (
      <p className="mb-3 last:mb-0 leading-relaxed text-muted-foreground" {...props} />
    ),
    ul: ({ ...props }: HTMLAttributes<HTMLUListElement>) => (
      <ul className="list-disc pl-5 mb-3 space-y-1 text-muted-foreground" {...props} />
    ),
    ol: ({ ...props }: HTMLAttributes<HTMLOListElement>) => (
      <ol className="list-decimal pl-5 mb-3 space-y-1 text-muted-foreground" {...props} />
    ),
    li: ({ ...props }: HTMLAttributes<HTMLLIElement>) => (
      <li className="text-sm my-1" {...props} />
    ),
    code: ({ ...props }: HTMLAttributes<HTMLElement>) => (
      <code
        className={`bg-black/35 px-1.5 py-0.5 rounded text-xs font-mono ${codeAccent}`}
        {...props}
      />
    ),
    pre: ({ ...props }: HTMLAttributes<HTMLPreElement>) => (
      <pre
        className="bg-black/60 p-4 rounded-lg border border-white/5 overflow-x-auto my-3 text-xs font-mono"
        {...props}
      />
    ),
    blockquote: ({ ...props }: HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote
        className="border-l-4 border-primary/40 pl-4 italic my-3 text-muted-foreground"
        {...props}
      />
    ),
    table: ({ ...props }: HTMLAttributes<HTMLTableElement>) => (
      <table className="w-full border-collapse border border-white/10 my-4" {...props} />
    ),
    th: ({ ...props }: HTMLAttributes<HTMLTableCellElement>) => (
      <th
        className={`border border-white/10 bg-white/5 p-3 text-left font-semibold text-xs ${accent}`}
        {...props}
      />
    ),
    td: ({ ...props }: HTMLAttributes<HTMLTableCellElement>) => (
      <td className="border border-white/10 p-3 text-left text-sm text-neutral-300 min-h-[60px] align-top" {...props} />
    ),
  };
}

export interface ActividadMarkdownProps {
  content: unknown;
  variant?: ActividadMarkdownVariant;
  className?: string;
}

export function ActividadMarkdown({
  content,
  variant = "document",
  className = "",
}: ActividadMarkdownProps) {
  const normalized = normalizeActividadMarkdown(content);
  if (!normalized) return null;

  return (
    <div className={`actividad-markdown [&_.katex]:text-[1.05em] ${className}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={buildComponents(variant)}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
