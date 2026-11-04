import { z } from "zod";

import type { Contexto } from "@opai/capabilities";
import { defineAjustes, valoresEfectivos } from "@opai/capabilities";
import { AFP, type AdministradoraAFP } from "@opai/domain";

/**
 * Supuestos previsionales por defecto del tenant para cotizar (R12: AFP y salud de referencia son del
 * tenant). Se declaran en el manifest y se editan en Configuración › CPQ › Ajustes (ADR-018); la línea
 * los sobrescribe con «Sobrescrito» en `SupuestosPrevisionales`.
 */
export const ajustesCpq = z.object({
  supuestos_afp: z.enum(AFP).default("modelo").meta({
    etiqueta: "AFP de referencia para cotizar",
    ayuda: "La que se usa en cada puesto cotizado si la línea no dice otra.",
    grupo: "Supuestos previsionales",
    ambito: "tenant",
    permiso: "cpq:modelo.manage",
    control: "seleccion",
  }),
  supuestos_salud: z.enum(["fonasa", "isapre"]).default("fonasa").meta({
    etiqueta: "Salud de referencia para cotizar",
    ayuda: "Fonasa 7 % por defecto; con Isapre, el plan se indica en la línea.",
    grupo: "Supuestos previsionales",
    ambito: "tenant",
    permiso: "cpq:modelo.manage",
    control: "seleccion",
  }),
  supuestos_contrato: z.enum(["indefinido", "plazo_fijo"]).default("indefinido").meta({
    etiqueta: "Tipo de contrato de referencia",
    ayuda: "Define la tasa de seguro de cesantía del empleador.",
    grupo: "Supuestos previsionales",
    ambito: "tenant",
    permiso: "cpq:modelo.manage",
    control: "seleccion",
  }),
  enlace_publico: z.boolean().default(false).meta({
    etiqueta: "Compartir cotizaciones por enlace público",
    ayuda:
      "Apagado por defecto. Solo aplica si la empresa no usa el Portal Cliente: con el portal activo, el cliente ve sus cotizaciones ahí y el enlace suelto no se puede crear.",
    grupo: "Compartir",
    ambito: "tenant",
    permiso: "cpq:modelo.manage",
    control: "switch",
  }),
});

export type SupuestosTenant = {
  afp: AdministradoraAFP;
  salud: "fonasa" | "isapre";
  contrato: "indefinido" | "plazo_fijo";
};

export const SUPUESTOS_DEFECTO: SupuestosTenant = { afp: "modelo", salud: "fonasa", contrato: "indefinido" };

export const CAMPOS_CPQ = defineAjustes("cpq", ajustesCpq);

/** Valores efectivos (defecto → plataforma → tenant); no depende de que el módulo esté registrado. */
export async function supuestosTenant(ctx: Contexto): Promise<SupuestosTenant> {
  const v = await valoresEfectivos(ctx, CAMPOS_CPQ);
  const leer = <T>(clave: string, defecto: T) => (v.get(`cpq.${clave}`)?.valor as T | undefined) ?? defecto;
  return {
    afp: leer("supuestos_afp", SUPUESTOS_DEFECTO.afp),
    salud: leer("supuestos_salud", SUPUESTOS_DEFECTO.salud),
    contrato: leer("supuestos_contrato", SUPUESTOS_DEFECTO.contrato),
  };
}
