import { TODAS } from "./grupos";
import type { CampoDef } from "./tipos";

/** Tablas HTML listas para incrustar en la plantilla (no se escapan al renderizar). */
export const CAMPOS_BLOQUE_PROPUESTA: readonly CampoDef[] = [
  {
    clave: "bloque.tabla_servicio",
    descripcion: "Tabla HTML con puestos, dotación, turno y precio mensual",
    tipo: "texto",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    alias: ["tabla_servicio"],
    contenidoHtml: true,
    ejemplo: "<table>…</table>",
  },
  {
    clave: "bloque.resumen_economico",
    descripcion: "Resumen económico mensual (neto, IVA, total y meses de contrato)",
    tipo: "texto",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    alias: ["resumen_economico"],
    contenidoHtml: true,
    ejemplo: "<table>…</table>",
  },
  {
    clave: "bloque.secciones",
    descripcion: "Secciones activas del armador (índice, títulos y textos), en orden; sin el marcador van al final",
    tipo: "texto",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: ["propuesta"],
    alias: ["secciones"],
    contenidoHtml: true,
    ejemplo: "<h2>1. Comprensión del servicio</h2><p>…</p>",
  },
];
