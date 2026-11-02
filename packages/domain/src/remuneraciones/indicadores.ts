import type { Vigencia } from "../estructuras";

export const AFP = ["uno", "modelo", "planvital", "habitat", "capital", "cuprum", "provida"] as const;
export type AdministradoraAFP = (typeof AFP)[number];
/** UTM y cantidades UF usan UF_ESCALA; tasas usan PCT_ESCALA; valor UF en centavos. */
export type TramoImpuesto = { hastaUtm: number | null; tasa: number; rebajaUtm: number };
export type DatosIndicadores = {
  uf: number;
  utm: number;
  imm: number;
  topes: { pensionSaludUf: number; ipsUf: number; cesantiaUf: number; indemnizacionUf: number };
  afp: { obligatoria: number; comisiones: Record<AdministradoraAFP, number>; salud: number };
  sis: number;
  reforma: { tasa: number; incluyeSis: boolean };
  cesantia: { indefinidoEmpleador: number; plazoFijoEmpleador: number; indefinidoTrabajador: number };
  mutual: { basica: number; sanna: number };
  jornada: number;
  impuesto: readonly TramoImpuesto[];
};
export type Indicador = keyof DatosIndicadores;
export type ValorIndicador<K extends Indicador = Indicador> = {
  [P in K]: Vigencia & {
    indicador: P; valor: DatosIndicadores[P]; fuente: string; consultadaEl?: string;
    verificacion: "verificado" | "por_verificar";
    estado: "vigente" | "retenido" | "propuesto" | "rechazado";
  }
}[K];

/** 11 indicadores independientes; gratificación es derivada del IMM (art. 50). */
export const INDICADORES = {
  uf: { periodicidad: "diaria", unidad: "centavos", fuente: "SII" },
  utm: { periodicidad: "mensual", unidad: "clp", fuente: "SII" },
  imm: { periodicidad: "ley", unidad: "clp", fuente: "Diario Oficial / DT" },
  topes: { periodicidad: "anual", unidad: "uf_escalada", fuente: "Superintendencia de Pensiones" },
  afp: { periodicidad: "ley", unidad: "tasa_escalada", fuente: "Superintendencia de Pensiones" },
  sis: { periodicidad: "licitacion", unidad: "tasa_escalada", fuente: "Superintendencia de Pensiones" },
  reforma: { periodicidad: "ley", unidad: "tasa_escalada", fuente: "Ley 21.735" },
  cesantia: { periodicidad: "ley", unidad: "tasa_escalada", fuente: "Ley 19.728 / DT" },
  mutual: { periodicidad: "ley", unidad: "tasa_escalada", fuente: "Ley 16.744 / SUSESO" },
  jornada: { periodicidad: "ley", unidad: "horas", fuente: "Ley 21.561 / DT" },
  impuesto: { periodicidad: "ley", unidad: "utm_escalada", fuente: "SII" },
} as const satisfies Record<Indicador, object>;

export const CLAVES_INDICADORES = Object.keys(INDICADORES) as Indicador[];
