// Áreas de navegación del ERP (Brief 05, ADR-046, NAVEGACION.md §7). Lista cerrada y en el orden de
// R1: Inicio (suelta), Comercial, Clientes, Operaciones, Personas, Finanzas, Documentos.
// Configuración no es un área: la agrega el núcleo al pie, fuera de esta lista (ADR-018).

export const AREAS_NAV = [
  "inicio",
  "comercial",
  "clientes",
  "operaciones",
  "personas",
  "finanzas",
  "documentos",
] as const;

export type AreaNav = (typeof AREAS_NAV)[number];

export function esAreaNav(valor: string): valor is AreaNav {
  return (AREAS_NAV as readonly string[]).includes(valor);
}

/** Etiqueta del área en la barra lateral (D1/D4); Inicio no se usa como encabezado de grupo (R3). */
export const ETIQUETA_AREA: Readonly<Record<AreaNav, string>> = {
  inicio: "Inicio",
  comercial: "Comercial",
  clientes: "Clientes",
  operaciones: "Operaciones",
  personas: "Personas",
  finanzas: "Finanzas",
  documentos: "Documentos",
};

/** D2: máximo de entradas por área antes de que el núcleo falle en desarrollo y en `pnpm test`. */
export const MAXIMO_ENTRADAS_POR_AREA = 7;

/** D3: máximo de fijados por usuario. */
export const MAXIMO_FIJADOS = 5;
