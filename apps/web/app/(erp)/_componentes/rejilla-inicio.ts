const BLOQUE = "min-w-0 empty:hidden";

/** Clases de la rejilla de Inicio y de cada bloque (marco base, sin empresa). */
export const rejillaInicio = {
  rejilla: "grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:grid-cols-[minmax(0,1fr)_380px]",
  indicadores: `${BLOQUE} max-lg:order-3 lg:col-span-2 lg:row-start-1`,
  decision: `${BLOQUE} max-lg:order-1 lg:col-start-1 lg:row-start-2`,
  tareas: `${BLOQUE} max-lg:order-2 lg:col-start-1 lg:row-start-3`,
  accesos: `${BLOQUE} max-lg:order-5 lg:col-start-2 lg:row-start-2`,
  seguimientos: `${BLOQUE} max-lg:order-4 lg:col-start-2 lg:row-start-3 xl:col-start-1 xl:row-start-4`,
  actividad: `${BLOQUE} max-lg:order-6 lg:col-span-2 lg:row-start-4 xl:col-span-1 xl:col-start-2 xl:row-span-2 xl:row-start-3`,
} as const;
