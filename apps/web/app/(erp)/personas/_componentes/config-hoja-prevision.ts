import {
  AFPS,
  DISCAPACIDAD_INVALIDEZ,
  MONEDAS_APV,
  REGIMENES_APV,
  REGIMENES_PREVISIONALES,
  SISTEMAS_SALUD,
  TIPOS_PENSION,
  TRAMOS_ASIGNACION,
  type OpcionCatalogo,
} from "@opai/domain";

import { t, type CampoLaboral, type ConfigSeccion } from "./campos-laboral";

const op = (clave: string, etiqueta: string, c: readonly OpcionCatalogo[]): CampoLaboral => ({
  clave,
  etiqueta,
  tipo: "opcion",
  opciones: c.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta })),
});
const sn = (clave: string, etiqueta: string): CampoLaboral => ({ clave, etiqueta, tipo: "si_no" });
const cargas = (clave: string, etiqueta: string): CampoLaboral => ({ clave, etiqueta, tipo: "entero", min: 0, maxValor: 20 });

/** CAR-276: previsión completa del export aprobado (pantalla «Previsión»), con catálogos y no texto libre. */
export const HOJA_PREVISION: ConfigSeccion = {
  param: "editar-prevision",
  titulo: "Editar previsión",
  capacidad: "core.personas.prevision_actualizar",
  exito: "Previsión actualizada",
  boton: "Guardar",
  campos: [
    op("afp", "AFP", AFPS),
    op("regimen", "Régimen previsional", REGIMENES_PREVISIONALES),
    op("tipoPension", "Tipo de pensión", TIPOS_PENSION),
    sn("jubilado", "Jubilado"),
    op("sistemaSalud", "Sistema de salud", SISTEMAS_SALUD),
    t("isapreNombre", "Isapre", 120),
    t("planIsapre", "Plan Isapre", 500),
    { clave: "planUf", etiqueta: "Plan (UF)", tipo: "decimal", max: 20 },
    { clave: "cotizacionUfPct", etiqueta: "Cotización UF", tipo: "decimal", max: 20 },
    { clave: "saludAdicionalPct", etiqueta: "% adicional de salud", tipo: "decimal", max: 8 },
    sn("cotizaAfp", "Cotiza AFP"),
    sn("cotizaAfc", "Cotiza seguro de cesantía (AFC)"),
    sn("cotizaSalud", "Cotiza salud"),
    t("apvInstitucion", "APV · institución", 80),
    op("apvRegimen", "APV · régimen", REGIMENES_APV),
    { clave: "apvMonto", etiqueta: "APV · monto", tipo: "decimal", max: 16 },
    op("apvMoneda", "APV · moneda", MONEDAS_APV),
    op("tramoAsignacion", "Tramo de asignación familiar", TRAMOS_ASIGNACION),
    cargas("cargasSimples", "Cargas simples"),
    cargas("cargasMaternales", "Cargas maternales"),
    cargas("cargasInvalidez", "Cargas de invalidez"),
    op("discapacidadInvalidez", "Discapacidad o pensión de invalidez", DISCAPACIDAD_INVALIDEZ),
  ],
  armar: (id, c) => ({ id, ...c }),
};
