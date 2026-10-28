export type Anexo = {
  id: string;
  personaId: string;
  vinculoId: string;
  motivoCambio: "capa" | "monto" | "instalacion" | "rol";
  snapshotAntes: unknown;
  snapshotDespues: unknown;
  generadoPorTipo: "evento" | "usuario" | "agente";
  generadoPorId: string | null;
  estado: "borrador" | "aprobado" | "rechazado";
  aprobadoPorId: string | null;
  aprobadoEn: string | null;
  rechazadoPorId: string | null;
  rechazadoEn: string | null;
  motivoRechazo: string | null;
  documentoId: string | null;
  creadoEn: string;
};

export type AnexoDetalle = Anexo & {
  filas: { concepto: string; antes: string; despues: string }[];
};

export const TITULO_MOTIVO: Record<Anexo["motivoCambio"], string> = {
  capa: "Capa de sueldo",
  monto: "Monto de sueldo",
  instalacion: "Instalación o puesto",
  rol: "Rol de turno",
};
