/** CSS for AI-generated HTML workshops (screen + print). */
export const ACTIVIDAD_TALLER_CSS = `
  .actividad-taller {
    font-size: 14px;
    line-height: 1.55;
    color: #111827;
  }
  .actividad-taller .taller-encabezado {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.25rem;
    font-size: 12px;
  }
  .actividad-taller .taller-encabezado th,
  .actividad-taller .taller-encabezado td {
    border: 1px solid #111;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  .actividad-taller .taller-encabezado .guia-numero {
    color: #b91c1c;
    font-weight: bold;
  }
  .actividad-taller .taller-section {
    margin-bottom: 1.75rem;
    page-break-inside: avoid;
  }
  .actividad-taller .taller-titulo-seccion {
    font-size: 15px;
    font-weight: bold;
    text-transform: uppercase;
    text-decoration: underline;
    margin: 1.25rem 0 0.5rem;
    color: #111;
  }
  .actividad-taller .taller-instruccion {
    margin: 0.5rem 0 0.75rem;
    font-size: 13.5px;
    color: #374151;
  }
  .actividad-taller .taller-tabla {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75rem 0 1rem;
    page-break-inside: avoid;
  }
  .actividad-taller .taller-tabla th,
  .actividad-taller .taller-tabla td {
    border: 1px solid #374151;
    padding: 10px 8px;
    text-align: left;
    vertical-align: top;
    min-height: 2.5rem;
  }
  .actividad-taller .taller-tabla thead th {
    background: #fde68a;
    font-weight: 700;
    font-size: 12px;
  }
  .actividad-taller .taller-tabla tbody td:empty,
  .actividad-taller .taller-celda-vacia {
    min-height: 3rem;
    background: #fafafa;
  }
  .actividad-taller .taller-grilla {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 0.75rem 0 1rem;
  }
  .actividad-taller .taller-grilla-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  .actividad-taller .taller-grilla-item {
    border: 1px solid #9ca3af;
    padding: 12px 8px;
    min-height: 3.5rem;
    font-size: 13px;
    text-align: center;
  }
  .actividad-taller .taller-espacio-respuesta {
    border: 1px solid #d1d5db;
    background: #f9fafb;
    padding: 8px 10px;
    margin: 0.5rem 0 0.75rem;
    font-size: 11px;
    color: #6b7280;
    font-style: italic;
  }
  .actividad-taller .taller-lineas {
    border-bottom: 1px solid #9ca3af;
    min-height: 1.75rem;
    margin: 0.35rem 0;
  }
  .actividad-taller .taller-flecha {
    font-size: 1.25rem;
    margin: 0 0.35rem;
    vertical-align: middle;
  }
  @media print {
    .actividad-taller .taller-grilla {
      gap: 6px;
    }
  }
`;
