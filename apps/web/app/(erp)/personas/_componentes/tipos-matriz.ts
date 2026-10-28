// Salida de core.documentos.matriz (semáforo de vencimientos por persona).

export type EstadoCelda = "vigente" | "por_vencer" | "vencido" | "sin_fecha" | "falta";
export type Celda = {
  tipoId: string;
  estado: EstadoCelda;
  dias: number | null;
  documentoId: string | null;
};
export type FilaMatriz = {
  personaId: string;
  nombre: string;
  cargo: string | null;
  instalacion: string | null;
  celdas: Celda[];
};
export type Matriz = {
  limiteExcedido: boolean;
  tipos: { id: string; nombre: string; obligatorio: boolean }[];
  filas: FilaMatriz[];
  resumen: {
    personas: number;
    conPendientes: number;
    vencidos: number;
    porVencer: number;
    faltan: number;
  };
};

export const PENDIENTES: EstadoCelda[] = ["vencido", "por_vencer", "falta"];
export const pendientes = (f: FilaMatriz) => f.celdas.filter((c) => PENDIENTES.includes(c.estado));

/** Nombre corto de un tipo para chips densos ("Credencial OS-10" → "Credencial"). */
export const corto = (nombre: string) =>
  nombre
    .replace(/^Certificado de /i, "")
    .replace(/ (de|del) .*$/i, "")
    .replace(/ OS-10$/, "");
