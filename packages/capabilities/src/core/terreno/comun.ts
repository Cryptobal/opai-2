import { z } from "zod";

import type { TenantTx } from "@opai/db";
import { PIN_BLOQUEO_MINUTOS_DEFECTO, PIN_INTENTOS_MAXIMOS_DEFECTO } from "@opai/domain";

import { dondePersona } from "../maestros/alcance";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";

/** Persona de la empresa dentro del alcance del actor, o NOT_FOUND (igual que si fuera de otra empresa). */
export async function personaDeTerreno(ctx: Contexto, personaId: string, db = ctx.db) {
  const persona = await db.persona.findFirst({
    where: { id: personaId, archivadaEn: null, anonimizadaEn: null, AND: [dondePersona(ctx)] },
    select: { id: true, rut: true, usuarioId: true },
  });
  if (!persona) throw noEncontrado("La persona");
  return persona;
}

/** Por qué un PIN no serviría para ingresar aunque sea correcto (ayuda a RR. HH.). */
export const motivoSinIngresoSchema = z.enum(["sin_usuario", "portal_no_admitido"]);
export type MotivoSinIngreso = z.infer<typeof motivoSinIngresoSchema>;

/** El PIN solo abre Trabajador y Terreno: la persona necesita un usuario cuyos portales sean solo esos. */
export async function motivoSinIngreso(
  ctx: Contexto,
  persona: { usuarioId: string | null },
  db = ctx.db,
): Promise<MotivoSinIngreso | null> {
  if (!persona.usuarioId) return "sin_usuario";
  const m = await db.membership.findFirst({
    where: { tenantId: ctx.tenantId, userId: persona.usuarioId, estado: "activa" },
    select: { portales: true },
  });
  const ok =
    !!m && m.portales.length > 0 && m.portales.every((p) => p === "trabajador" || p === "terreno");
  return ok ? null : "portal_no_admitido";
}

/** Intentos y minutos de bloqueo de la empresa (ajustes del núcleo); fuera de rango, el defecto. */
export async function politicaDelTenant(tx: TenantTx, tenantId: string) {
  const f = await tx.ajuste.findMany({
    where: {
      ambito: "tenant",
      sujetoId: tenantId,
      modulo: "core",
      clave: { in: ["terreno_pin_intentos_maximos", "terreno_pin_bloqueo_minutos"] },
    },
    select: { clave: true, valor: true },
  });
  const n = (k: string, d: number, min: number, max: number) => {
    const v = f.find((x) => x.clave === k)?.valor;
    return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : d;
  };
  return {
    intentosMaximos: n("terreno_pin_intentos_maximos", PIN_INTENTOS_MAXIMOS_DEFECTO, 3, 10),
    bloqueoMinutos: n("terreno_pin_bloqueo_minutos", PIN_BLOQUEO_MINUTOS_DEFECTO, 5, 1440),
  };
}

export const pinSchema = z.string().regex(/^\d{6}$/, "El PIN debe tener exactamente 6 dígitos.");

/** Usuario humano detrás de la ejecución, o null en un proceso del sistema. */
export const quien = (ctx: Contexto) =>
  ctx.actor.tipo === "user" ? ctx.actor.id : (ctx.actor.viaUserId ?? null);
