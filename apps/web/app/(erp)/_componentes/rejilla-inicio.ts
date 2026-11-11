const BLOQUE = "min-w-0 empty:hidden";

const CLASICO = {
  rejilla: "grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:grid-cols-[minmax(0,1fr)_380px]",
  indicadores: `${BLOQUE} max-lg:order-3 lg:col-span-2 lg:row-start-1`,
  decision: `${BLOQUE} max-lg:order-1 lg:col-start-1 lg:row-start-2`,
  tareas: `${BLOQUE} max-lg:order-2 lg:col-start-1 lg:row-start-3`,
  accesos: `${BLOQUE} max-lg:order-5 lg:col-start-2 lg:row-start-2`,
  seguimientos: `${BLOQUE} max-lg:order-4 lg:col-start-2 lg:row-start-3 xl:col-start-1 xl:row-start-4`,
  actividad: `${BLOQUE} max-lg:order-6 lg:col-span-2 lg:row-start-4 xl:col-span-1 xl:col-start-2 xl:row-span-2 xl:row-start-3`,
} as const;

// En el marco Hilo (ADR-090) lo que requiere decisión vive en el hilo y el lienzo es más angosto que
// la ventana: dos columnas parejas desde 1280 px y colocación automática, para que un bloque que no
// aparece no deje una columna vacía. El bloque de decisión se sigue pintando y se oculta con CSS solo
// dentro del marco Hilo: si el marco montado fuera el clásico, nunca quedan pendientes escondidos.
const HILO = {
  rejilla: "grid gap-4 xl:grid-cols-2",
  indicadores: `${BLOQUE} xl:col-span-2`,
  decision: `${BLOQUE} marco-hilo:hidden`,
  tareas: BLOQUE,
  accesos: BLOQUE,
  seguimientos: BLOQUE,
  actividad: BLOQUE,
} as const;

/** Clases de la rejilla de Inicio y de cada bloque, según el marco. */
export const rejillaInicio = (hilo: boolean) => (hilo ? HILO : CLASICO);
