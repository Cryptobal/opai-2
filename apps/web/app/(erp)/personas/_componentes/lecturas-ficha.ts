import { cache } from "react";

import { ejecutarComoUsuario } from "@/lib/servidor";

/**
 * Lecturas de la ficha por request (CAR-124): el Resumen y las secciones de Laboral comparten una sola llamada
 * por capacidad, en vez de una por tarjeta (consultas por navegación, ADR-045). Mismo permiso y auditoría.
 */
export type Uniforme = {
  tallaCamisa: string | null;
  tallaPantalon: string | null;
  tallaChaqueta: string | null;
  tallaZapato: string | null;
  tallaPolera: string | null;
  tallaGeologo: string | null;
  tallaPolar: string | null;
  estaturaCm: number | null;
  pesoKg: number | null;
  notas: string | null;
  entregas: {
    id: string;
    entregadaEn: string;
    articulo: string;
    talla: string | null;
    cantidad: number;
  }[];
};
export type JornadaDt = {
  resolucion: string | null;
  resolucionVigenteDesde: string | null;
  resolucionVigenteHasta: string | null;
  horasSemanales: string | null;
  distribucion: string | null;
  articulo22: boolean;
  avisoTerminoDias: number | null;
};
/** Período del contrato (CAR-409): renovación de plazo fijo o paso a indefinido. */
export type PeriodoContrato = {
  id: string;
  tipo: "plazo_fijo" | "indefinido";
  numero: number | null;
  inicio: string;
  termino: string | null;
};
export type ContratoPeriodos = {
  vinculoId: string;
  inicioContrato: string;
  tipoContrato: string;
  periodos: PeriodoContrato[];
  periodoVigente: number | null;
  terminoVigente: string | null;
  indefinidoDesde: string | null;
};
export type Laboral = {
  uniforme: Uniforme | null;
  jornadaDt: JornadaDt | null;
  contrato: ContratoPeriodos | null;
  os10: { credencial: string | null; venceEn: string | null } | null;
  contacto: {
    estadoCivil: string | null;
    telefonoSecundario: string | null;
    emergenciaNombre: string | null;
    emergenciaRelacion: string | null;
    emergenciaTelefono: string | null;
    codigoInterno: string | null;
    movilizacion: string | null;
  } | null;
};
export type Prevision = {
  personaId: string;
  afp: string | null;
  regimen: string | null;
  sistemaSalud: string | null;
  isapreNombre: string | null;
  planIsapre: string | null;
  planUf: string | null;
  cotizacionUfPct: string | null;
  jubilado: boolean;
  tipoPension: string | null;
  cotizaAfp: boolean;
  cotizaAfc: boolean;
  cotizaSalud: boolean;
  saludAdicionalPct: string | null;
  apvInstitucion: string | null;
  apvRegimen: string | null;
  apvMonto: string | null;
  apvMoneda: string | null;
  tramoAsignacion: string | null;
  cargasSimples: number | null;
  cargasMaternales: number | null;
  cargasInvalidez: number | null;
  discapacidadInvalidez: string | null;
  sensiblesOcultos: boolean;
};
export type CuentaPago = {
  bancoCodigo: string | null;
  tipoCuenta: string | null;
  numeroCuenta: string | null;
  rutTitular: string | null;
  titularNombre: string | null;
  /** CAR-244: nombre del catálogo SBIF y señal de dato escrito a mano que hay que corregir. */
  bancoNombre: string | null;
  tipoCuentaEtiqueta: string | null;
  porCorregir: boolean;
};
export type Pago = {
  personaId: string;
  vigente: CuentaPago;
  /** CAR-275: todas las cuentas; la por defecto va primero. */
  cuentas: (CuentaPago & { id: string; porDefecto: boolean })[];
  solicitudPendiente:
    | (CuentaPago & { id: string; tipo: "reemplazar" | "agregar" | "marcar_defecto" | "quitar" })
    | null;
};

export const laboralDe = cache((id: string) =>
  ejecutarComoUsuario<Laboral>("erp", "core.personas.laboral_ver", { id }),
);
export const previsionDe = cache((id: string) =>
  ejecutarComoUsuario<Prevision>("erp", "core.personas.prevision_ver", { id }),
);
export const pagoDe = cache((id: string) =>
  ejecutarComoUsuario<Pago>("erp", "core.personas.pago_ver", { id }),
);
