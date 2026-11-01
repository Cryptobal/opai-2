import type { CLP } from "../dinero";
import type { Estructura, Haberes, Gratificacion, ItemEstructura } from "../estructuras";
import type { CalculoHoras } from "../turnos";
import type { AdministradoraAFP, ValorIndicador } from "./indicadores";
import type { JuegoDeValores } from "./valores";

export type SueldoParaCostear = {
  sueldoBaseClp: number | "imm"; gratificacion: Gratificacion;
  gratificacionMontoClp?: number; colacionClp: number; movilizacionClp: number;
  haberes: readonly ItemEstructura[];
};
export type SupuestosProvisiones = {
  /** TODO(decisión Carlos): validar conversión a corridos/progresivo con contabilidad. Sin defecto. */
  diasVacacionesCorridosAnuales: number;
  baseVacaciones: "sueldo_base" | "imponible" | "sin_gratificacion";
  baseIndemnizacion: "sueldo_base" | "imponible" | "sin_gratificacion";
  mesesAntiguedad: number;
  probabilidadIndemnizacion: number;
};
export type EntradaCostoEmpleador = {
  sueldo: SueldoParaCostear | { capa: Estructura; baseAtadaImm?: boolean };
  contrato: "indefinido" | "plazo_fijo";
  afp: AdministradoraAFP;
  salud: { tipo: "fonasa" } | { tipo: "isapre"; planUf: number };
  /** Minutos semanales pactados: admite jornadas fraccionarias sin float. */
  jornadaMinutosSemanales: number;
  mutualAdicional: number;
  provisiones: SupuestosProvisiones;
  horario?: CalculoHoras;
};
export type TrazaRemuneracion = {
  concepto: string; paso: number; formula: string; valorClp: CLP;
  variables: Readonly<Record<string, number | string>>;
  indicadores: readonly ValorIndicador[];
};
export type DesgloseCostoEmpleador = {
  haberes: Haberes; basePrevisionalClp: CLP; baseCesantiaClp: CLP;
  sisClp: CLP; cesantiaEmpleadorClp: CLP; mutualClp: CLP; reformaClp: CLP;
  vacacionesClp: CLP; indemnizacionClp: CLP;
  afpClp: CLP; saludClp: CLP; saludDeducibleClp: CLP; cesantiaTrabajadorClp: CLP; impuestoUnicoClp: CLP;
};
export type ResultadoCostoEmpleador = {
  costoEmpresaMensualClp: CLP; liquidoEstimadoClp: CLP;
  desglose: DesgloseCostoEmpleador; traza: readonly TrazaRemuneracion[];
  huellaJuegoDeValores: string; juegoDeValores: JuegoDeValores;
  capaUsada: Estructura | null; entradaUsada: EntradaCostoEmpleador;
  advertencias: readonly string[];
};
/** Contrato del Núcleo. CPQ adapta su puerto síncrono sin importar módulos aquí (ADR-048). */
export type ContratoCostoEmpleador = (
  entrada: EntradaCostoEmpleador, juego: JuegoDeValores,
) => ResultadoCostoEmpleador;
