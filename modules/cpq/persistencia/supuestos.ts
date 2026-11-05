import { z } from "zod";

import type { Contexto } from "@opai/capabilities";
import { defineAjustes, valoresEfectivos } from "@opai/capabilities";
import { AFP, type AdministradoraAFP } from "@opai/domain";

import {
  MARGEN_ALERTA_DEFECTO_PUNTOS,
  MARGEN_MINIMO_DEFECTO_PCT,
  MARGEN_OBJETIVO_DEFECTO_PCT,
  margenesEscalados,
  type MargenesTenant,
  PCT_A_ESCALADO,
} from "../domain/margenes-defecto";

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
  margen_objetivo_defecto_pct: z.number().int().min(1).max(99).default(MARGEN_OBJETIVO_DEFECTO_PCT).meta({
    etiqueta: "Margen objetivo por defecto (%)",
    ayuda: "Margen sobre la venta con el que nace cada cotización nueva. Se puede cambiar en cada cotización.",
    grupo: "Márgenes",
    ambito: "tenant",
    permiso: "cpq:modelo.manage",
    control: "numero",
  }),
  margen_minimo_pct: z.number().int().min(0).max(99).default(MARGEN_MINIMO_DEFECTO_PCT).meta({
    etiqueta: "Margen mínimo (%)",
    ayuda: "Bajo este margen la cotización pide aprobación antes de dejarla lista o enviarla.",
    grupo: "Márgenes",
    ambito: "tenant",
    permiso: "cpq:modelo.manage",
    control: "numero",
  }),
  margen_alerta_puntos: z.number().int().min(0).max(50).default(MARGEN_ALERTA_DEFECTO_PUNTOS).meta({
    etiqueta: "Alerta sobre el mínimo (puntos)",
    ayuda: "El semáforo pasa a «Cerca del mínimo» cuando el margen supera el mínimo por menos de estos puntos.",
    grupo: "Márgenes",
    ambito: "tenant",
    permiso: "cpq:modelo.manage",
    control: "numero",
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

/** Márgenes de la empresa (objetivo por defecto, mínimo y alerta) como enteros escalados del motor. */
export async function margenesTenant(ctx: Contexto): Promise<MargenesTenant> {
  const v = await valoresEfectivos(ctx, CAMPOS_CPQ);
  const leer = (clave: string, defecto: number) => {
    const x = v.get(`cpq.${clave}`)?.valor;
    return typeof x === "number" && Number.isFinite(x) ? x : defecto;
  };
  return margenesEscalados({
    objetivo: leer("margen_objetivo_defecto_pct", MARGEN_OBJETIVO_DEFECTO_PCT),
    minimo: leer("margen_minimo_pct", MARGEN_MINIMO_DEFECTO_PCT),
    alerta: leer("margen_alerta_puntos", MARGEN_ALERTA_DEFECTO_PUNTOS),
  });
}

/**
 * Mínimo y alerta de margen solo si la empresa los configuró (CAR-192): `null` mientras valgan el defecto
 * del producto. La ficha no debe mostrar un mínimo que nadie fijó; el motor sigue usando `margenesTenant`.
 */
export async function margenesConfigurados(
  ctx: Contexto,
): Promise<{ minimoPct: number | null; alertaPct: number | null }> {
  const v = await valoresEfectivos(ctx, CAMPOS_CPQ);
  const leer = (clave: string, escala: number) => {
    const x = v.get(`cpq.${clave}`);
    return x && x.origen !== "defecto" && typeof x.valor === "number" && Number.isFinite(x.valor)
      ? x.valor * escala
      : null;
  };
  return {
    minimoPct: leer("margen_minimo_pct", PCT_A_ESCALADO),
    alertaPct: leer("margen_alerta_puntos", PCT_A_ESCALADO),
  };
}
