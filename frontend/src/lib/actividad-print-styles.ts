import { ACTIVIDAD_TALLER_CSS } from "./actividad-taller-styles";

/** Shared print/preview CSS for activity documents. */
export const ACTIVIDAD_PRINT_CSS = `
${ACTIVIDAD_TALLER_CSS}
  body {
    font-family: Georgia, 'Times New Roman', serif;
    margin: 40px;
    color: #111827;
    line-height: 1.6;
  }
  h1 {
    font-size: 22px;
    font-weight: bold;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 8px;
    margin-bottom: 16px;
    text-align: center;
  }
  h2 {
    font-size: 16px;
    font-weight: bold;
    margin-top: 20px;
    border-bottom: 1px solid #f3f4f6;
    padding-bottom: 4px;
  }
  h3 {
    font-size: 13px;
    font-weight: bold;
    margin-top: 14px;
  }
  p, li {
    font-size: 13.5px;
    color: #374151;
  }
  pre {
    background-color: #f3f4f6;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    font-family: monospace;
    font-size: 12.5px;
    border: 1px solid #e5e7eb;
  }
  code {
    font-family: monospace;
    background-color: #f3f4f6;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: 12.5px;
  }
  ul, ol {
    margin-left: 20px;
    margin-bottom: 12px;
  }
  li {
    margin-bottom: 4px;
  }
  .header-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 24px;
    border: 1px solid #e5e7eb;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 24px;
    font-size: 12px;
  }
  .header-info .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .header-info label {
    font-weight: 600;
    color: #6b7280;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .header-info .value {
    color: #111827;
    min-height: 1.25rem;
  }
  .header-info .blank {
    border-bottom: 1px solid #9ca3af;
    min-width: 140px;
    display: inline-block;
  }
  blockquote {
    border-left: 4px solid #d1d5db;
    padding-left: 12px;
    margin-left: 0;
    font-style: italic;
    color: #4b5563;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #9ca3af;
    padding: 12px;
    text-align: left;
    font-size: 13px;
    vertical-align: top;
  }
  th {
    background-color: #f3f4f6;
    font-weight: 600;
    color: #1f2937;
  }
  td {
    color: #374151;
    min-height: 80px;
  }
  tbody td:empty,
  tbody td:only-child:empty {
    min-height: 100px;
  }
  .instructions {
    font-style: italic;
    margin-bottom: 24px;
    font-size: 13.5px;
    color: #4b5563;
  }
  .grade-badge {
    display: inline-block;
    font-weight: bold;
    background: #f3f4f6;
    color: #1f2937;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    text-transform: uppercase;
    border: 1px solid #e5e7eb;
    margin-bottom: 12px;
  }
  .content-body {
    font-size: 14px;
    color: #111827;
  }
  p, li, tr, blockquote {
    page-break-inside: avoid;
  }
  @media print {
    body { margin: 0; }
    @page { 
      size: letter;
      margin: 2cm 2.5cm;
    }
  }
`;
