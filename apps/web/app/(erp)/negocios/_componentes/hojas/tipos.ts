import type { CuentaDetalle, CuentaFila } from "@/lib/tipos-maestros";

import type { NegocioDetalle } from "../datos";

export type Etapa = {
  id: string;
  nombre: string;
  orden: number;
  tipo: "abierta" | "ganada" | "perdida";
  probabilidad: number;
  tono: string;
  exige: string[];
  activa: boolean;
};

export type ItemCatalogo = { id: string; nombre: string; orden: number; activo: boolean };
export type Motivo = ItemCatalogo & { codigo: string; exigeDetalle: boolean };

/** Salida de `comercial.config.get`: el embudo por defecto y los catálogos del tenant. */
export type ConfigComercial = {
  embudo: { id: string; nombre: string; etapas: Etapa[] };
  tipos: ItemCatalogo[];
  origenes: ItemCatalogo[];
  motivos: Motivo[];
};

/** Parámetros que abren una hoja de Negocios (`?nuevo=1`, `?ganar=1`, `?mover=<etapaId>`…). */
export const PARAMS_HOJA = [
  "nuevo",
  "editar",
  "mover",
  "ganar",
  "perder",
  "reabrir",
  "instalaciones",
  "contactos",
] as const;
export type ParamHoja = (typeof PARAMS_HOJA)[number];

/** Lo que necesitan las hojas abiertas; se lee en el servidor solo si hay una abierta. */
export type DatosHojas = {
  abierta: ParamHoja;
  config: ConfigComercial | null;
  negocio: NegocioDetalle | null;
  /** Cuentas para «Nuevo negocio» (Combobox). */
  cuentas: CuentaFila[];
  cuentaInicial: string | null;
  /** Instalaciones y contactos de la cuenta del negocio (hojas de vínculos). */
  cuenta: CuentaDetalle | null;
};
