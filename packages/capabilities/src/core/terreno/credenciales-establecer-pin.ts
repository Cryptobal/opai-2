import { z } from "zod";

import { hashPin } from "@opai/db";
import { MENSAJE_PROBLEMA_PIN, problemaDePin } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { personaDeTerreno, pinSchema, quien } from "./comun";

export const credencialesTerrenoEstablecerPin = defineCapability({
  id: "core.credenciales_terreno.establecer_pin",
  descripcion:
    "La propia persona crea su primer PIN de terreno en el portal del trabajador cuando aún no tiene credencial. El PIN no se guarda ni se muestra en claro.",
  soloPersonas: true,
  permiso: null,
  portales: ["trabajador", "terreno"],
  input: z.object({ pin: pinSchema }),
  sensibles: ["pin"],
  output: z.object({ establecido: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { pin }, { dryRun }) {
    const userId = quien(ctx);
    if (!userId) throw prohibido("Solo la propia persona puede crear su PIN.");
    const persona =
      ctx.verComo?.personaId
        ? await personaDeTerreno(ctx, ctx.verComo.personaId)
        : await ctx.db.persona.findFirst({
            where: { usuarioId: userId, archivadaEn: null, anonimizadaEn: null },
            select: { id: true, rut: true },
          });
    if (!persona) throw noEncontrado("Tu ficha de persona");
    const existe = await ctx.db.credencialTerreno.findUnique({ where: { personaId: persona.id } });
    if (existe) throw reglaDeNegocio("Ya tienes un PIN. Cámbialo desde la opción correspondiente.");
    const problema = problemaDePin(pin, persona.rut);
    if (problema) throw reglaDeNegocio(MENSAJE_PROBLEMA_PIN[problema]);
    if (dryRun) return { establecido: false };
    const pinHash = await hashPin(pin);
    const ahora = new Date();
    await ctx.transaccion((tx) =>
      tx.credencialTerreno.create({
        data: {
          tenantId: ctx.tenantId,
          personaId: persona.id,
          pinHash,
          rut: persona.rut,
          intentosFallidos: 0,
          bloqueadoHasta: null,
          pinCambiadoEn: ahora,
          debeCambiar: false,
          asignadoPor: userId,
          asignadoEn: ahora,
        },
      }),
    );
    return { establecido: true };
  },
});