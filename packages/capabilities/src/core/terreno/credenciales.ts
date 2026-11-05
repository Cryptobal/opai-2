import { randomInt } from "node:crypto";
import { z } from "zod";

import { hashPin } from "@opai/db";
import { MENSAJE_PROBLEMA_PIN, PERMISOS_CORE, estaBloqueada, problemaDePin } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { credencialesTerrenoCambiarPin } from "./credenciales-cambiar";
import {
  motivoSinIngreso,
  motivoSinIngresoSchema,
  personaDeTerreno,
  pinSchema,
  quien,
} from "./comun";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** PIN temporal al azar que cumple las mismas reglas que uno elegido a mano. */
export function pinTemporal(rut: string): string {
  for (let i = 0; i < 50; i++) {
    const pin = String(randomInt(0, 1_000_000)).padStart(6, "0");
    if (!problemaDePin(pin, rut)) return pin;
  }
  return "482916";
}

const estadoSchema = z.object({
  personaId: z.string(),
  tienePin: z.boolean(),
  /** Debe cambiarlo en su primer ingreso (lo fijó RR. HH.). */
  debeCambiar: z.boolean(),
  bloqueadoHasta: z.string().nullable(),
  intentosFallidos: z.number().int(),
  pinCambiadoEn: z.string().nullable(),
  asignadoEn: z.string().nullable(),
  /** Preparación de T-04: el flujo de consentimiento llega con Face ID. */
  telefonoPersonalHabilitado: z.boolean(),
  /** Si hay un motivo, el PIN no serviría para ingresar aunque exista. */
  sinIngreso: motivoSinIngresoSchema.nullable(),
});

export const credencialesTerrenoEstado = defineCapability({
  id: "core.credenciales_terreno.estado",
  descripcion:
    "Muestra si una persona tiene PIN de terreno, si debe cambiarlo, si está bloqueada por intentos fallidos y si hay algo que le impide ingresar (sin usuario o con otros portales). Nunca muestra el PIN.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ personaId: uuidSchema }),
  output: estadoSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { personaId }) {
    const persona = await personaDeTerreno(ctx, personaId);
    const c = await ctx.db.credencialTerreno.findUnique({ where: { personaId } });
    return {
      personaId,
      tienePin: !!c,
      debeCambiar: c?.debeCambiar ?? false,
      bloqueadoHasta: estaBloqueada(c?.bloqueadoHasta ?? null, new Date())
        ? iso(c?.bloqueadoHasta ?? null)
        : null,
      intentosFallidos: c?.intentosFallidos ?? 0,
      pinCambiadoEn: iso(c?.pinCambiadoEn ?? null),
      asignadoEn: iso(c?.asignadoEn ?? null),
      telefonoPersonalHabilitado: c?.telefonoPersonalHabilitado ?? false,
      sinIngreso: await motivoSinIngreso(ctx, persona),
    };
  },
});

const resultadoSchema = z.object({
  personaId: z.string(),
  aplicado: z.boolean(),
  /** Primer ingreso: la persona debe cambiarlo. */
  debeCambiar: z.boolean(),
  /** Solo en `restablecer`: se muestra una vez; en la vista previa y en repeticiones, `null`. */
  pinTemporal: z.string().nullable(),
});

async function fijar(ctx: Contexto, persona: { id: string; rut: string }, pin: string) {
  const pinHash = await hashPin(pin);
  const ahora = new Date();
  const datos = {
    pinHash,
    rut: persona.rut,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    pinCambiadoEn: null,
    debeCambiar: true,
    asignadoPor: quien(ctx),
    asignadoEn: ahora,
  };
  await ctx.transaccion((tx) =>
    tx.credencialTerreno.upsert({
      where: { personaId: persona.id },
      create: { tenantId: ctx.tenantId, personaId: persona.id, ...datos },
      update: datos,
    }),
  );
}

export const credencialesTerrenoAsignarPin = defineCapability({
  id: "core.credenciales_terreno.asignar_pin",
  descripcion:
    "RR. HH. asigna el PIN de 6 dígitos con que una persona se identifica en terreno cuando no puede usar el rostro. Debe cambiarlo en su primer ingreso; el PIN nunca se guarda ni se muestra.",
  soloPersonas: true,
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ personaId: uuidSchema, pin: pinSchema }),
  sensibles: ["pin"],
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  auditoriaPayload: (_ctx, entrada) => ({ personaId: entrada.personaId }),
  async handler(ctx, { personaId, pin }, { dryRun }) {
    const persona = await personaDeTerreno(ctx, personaId);
    const problema = problemaDePin(pin, persona.rut);
    if (problema) throw reglaDeNegocio(MENSAJE_PROBLEMA_PIN[problema]);
    if (!dryRun) await fijar(ctx, persona, pin);
    return { personaId, aplicado: !dryRun, debeCambiar: true, pinTemporal: null };
  },
});

export const credencialesTerrenoRestablecer = defineCapability({
  id: "core.credenciales_terreno.restablecer",
  descripcion:
    "RR. HH. restablece el PIN de terreno de una persona: genera uno temporal de 6 dígitos, desbloquea la credencial y se lo muestra una sola vez. La persona debe cambiarlo en su primer ingreso.",
  soloPersonas: true,
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ personaId: uuidSchema }),
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  // El PIN temporal es de un solo uso: la repetición con la misma clave no lo devuelve (24 h).
  salidaIdempotente: (salida) => ({ ...salida, pinTemporal: null }),
  auditoriaPayload: (_ctx, entrada) => ({ personaId: entrada.personaId }),
  async handler(ctx, { personaId }, { dryRun }) {
    const persona = await personaDeTerreno(ctx, personaId);
    if (dryRun) return { personaId, aplicado: false, debeCambiar: true, pinTemporal: null };
    const pin = pinTemporal(persona.rut);
    await fijar(ctx, persona, pin);
    return { personaId, aplicado: true, debeCambiar: true, pinTemporal: pin };
  },
});

export const capacidadesCredencialesTerreno = [
  credencialesTerrenoCambiarPin,
  credencialesTerrenoEstado,
  credencialesTerrenoAsignarPin,
  credencialesTerrenoRestablecer,
];
