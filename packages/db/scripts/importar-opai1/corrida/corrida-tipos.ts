// Tipos de corrida identificada (core.importaciones).
export const CONTRATO_OPAI1 = "opai1-export/v1";
export const ORIGEN_OPAI1 = "opai1";

export type ModoCorrida = "simular" | "aplicar";
export type EstadoCorrida = "en_curso" | "completada" | "revertida" | "fallida";
export type AccionFila = "creado" | "completado" | "sin_cambio" | "omitido";

export type ConteosCorrida = {
  creados: number;
  completados: number;
  sinCambio: number;
  omitidos: number;
};

export type FilaCorrida = {
  entidad: string;
  idOpai1: string;
  idOpai2: string | null;
  accion: AccionFila;
  valoresPrevios: Record<string, unknown> | null;
};

export type CorridaRegistro = {
  id: string;
  tenantId: string;
  origen: string;
  contratoVersion: string;
  modo: ModoCorrida;
  estado: EstadoCorrida;
  conteos: ConteosCorrida;
  lanzadoPorId: string | null;
};

export const conteosVacios = (): ConteosCorrida => ({
  creados: 0,
  completados: 0,
  sinCambio: 0,
  omitidos: 0,
});

export function sumarAccion(conteos: ConteosCorrida, accion: AccionFila) {
  if (accion === "creado") conteos.creados += 1;
  else if (accion === "completado") conteos.completados += 1;
  else if (accion === "sin_cambio") conteos.sinCambio += 1;
  else conteos.omitidos += 1;
}
