import type { Aviso, Decision } from "./comun";

export type DatosEtapa = {
  nombre: string;
  orden: number;
  tipo: string;
  exige: string[];
};

export type DatosNegocio = {
  cuentaId: string;
  etapaIdOpai1: string;
  titulo: string;
  instalacionIdsOpai1: string[];
};

export type DatosHistorialEtapa = {
  negocioIdOpai1: string;
  desdeEtapaIdOpai1: string | null;
  haciaEtapaIdOpai1: string;
  cuando: string;
};

export type DatosNegocioContacto = {
  negocioIdOpai1: string;
  contactoId: string;
  rol: string;
  esPrincipal: boolean;
};

export type { DatosCotizacion } from "./cotizaciones-tipos";
import type { DatosCotizacion } from "./cotizaciones-tipos";

export type PlanComercial = {
  etapas: Decision<DatosEtapa>[];
  negocios: Decision<DatosNegocio>[];
  historial: Decision<DatosHistorialEtapa>[];
  contactosNegocio: Decision<DatosNegocioContacto>[];
  cotizaciones: Decision<DatosCotizacion>[];
  avisos: Aviso[];
};

export type ResolverId = (idOpai1: string) => string | null;

export function ordenPorId<T extends { id: string }>(filas: readonly T[]): T[] {
  return [...filas].sort((a, b) => a.id.localeCompare(b.id));
}

export function etapaUtilizable(d: Decision<DatosEtapa> | undefined): boolean {
  return d !== undefined && d.accion !== "omitido" && d.accion !== "conflicto";
}

export function negocioImportable(d: Decision<DatosNegocio> | undefined): boolean {
  return (
    d !== undefined &&
    (d.accion === "crear" || d.accion === "sin_cambios" || d.accion === "actualizar")
  );
}
