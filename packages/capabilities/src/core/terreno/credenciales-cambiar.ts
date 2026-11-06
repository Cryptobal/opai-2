import { z } from "zod";

import { hashPin, registrarBloqueoPin, verificarPin } from "@opai/db";
import {
  COMUNICABLES_NUCLEO,
  MENSAJE_PROBLEMA_PIN,
  estaBloqueada,
  problemaDePin,
  renderizarCorreo,
  trasFallo,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { pinSchema, politicaDelTenant, quien } from "./comun";

export const credencialesTerrenoCambiarPin = defineCapability({
  id: "core.credenciales_terreno.cambiar_pin",
  descripcion:
    "La propia persona cambia su PIN de terreno desde el Portal Trabajador, con su PIN actual. Tras varios intentos incorrectos la credencial se pausa, igual que al ingresar.",
  soloPersonas: true,
  permiso: null,
  portales: ["trabajador", "terreno"],
  input: z.object({ pinActual: pinSchema, pinNuevo: pinSchema }),
  sensibles: ["pinActual", "pinNuevo"],
  output: z.object({ cambiado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { pinActual, pinNuevo }, { dryRun }) {
    const userId = quien(ctx);
    if (!userId) throw prohibido("Solo la propia persona puede cambiar su PIN.");
    const persona = await ctx.db.persona.findFirst({
      where: { usuarioId: userId, archivadaEn: null, anonimizadaEn: null },
      select: { id: true, rut: true },
    });
    if (!persona) throw noEncontrado("Tu ficha de persona");
    const problema = problemaDePin(pinNuevo, persona.rut);
    if (problema) throw reglaDeNegocio(MENSAJE_PROBLEMA_PIN[problema]);
    if (pinNuevo === pinActual) throw reglaDeNegocio("Elige un PIN distinto del actual.");
    if (dryRun) return { cambiado: false };
    const ahora = new Date();
    const c = await ctx.db.credencialTerreno.findUnique({ where: { personaId: persona.id } });
    if (!c) throw reglaDeNegocio("Todavía no tienes un PIN. Pídele a RR. HH. que te asigne uno.");
    if (estaBloqueada(c.bloqueadoHasta, ahora))
      throw reglaDeNegocio("Demasiados intentos. Vuelve a intentarlo en unos minutos.");
    if (!(await verificarPin(pinActual, c.pinHash))) {
      // El intento fallido debe persistir aunque esta ejecución termine en error (y se revierta):
      // va en una transacción independiente, como los diagnósticos durables.
      const aviso = await ctx.transaccionIndependiente(async (tx) => {
        const politica = await politicaDelTenant(tx, ctx.tenantId);
        const nuevo = trasFallo(
          { intentosFallidos: c.intentosFallidos, bloqueadoHasta: c.bloqueadoHasta },
          ahora,
          politica,
        );
        await tx.credencialTerreno.update({ where: { personaId: persona.id }, data: nuevo });
        if (!nuevo.bloqueadoHasta) return null;
        // Mismo aviso y rastro que en el ingreso: una vez por bloqueo (decisión de Carlos sobre F5, N5).
        return registrarBloqueoPin(tx, {
          tenantId: ctx.tenantId,
          personaId: persona.id,
          userId,
          minutos: politica.bloqueoMinutos,
          ipHmac: null,
          userAgent: null,
        });
      });
      if (aviso) {
        ctx.diferir(async () => {
          const e = COMUNICABLES_NUCLEO.find((x) => x.evento === "core.usuario.pin_bloqueado");
          if (!e?.plantillas.correo) return;
          const r = renderizarCorreo(
            e,
            e.plantillas.correo,
            { usuario: { nombre: aviso.nombre }, minutos: String(aviso.minutos) },
            { nombre: "OPAI" },
          );
          await ctx.servicios.correo.enviar({
            para: aviso.correo,
            asunto: r.asunto,
            texto: r.texto,
            html: r.html,
          });
        });
      }
      throw reglaDeNegocio("El PIN actual no es correcto.");
    }
    const pinHash = await hashPin(pinNuevo);
    await ctx.transaccion((tx) =>
      tx.credencialTerreno.update({
        where: { personaId: persona.id },
        data: {
          pinHash,
          intentosFallidos: 0,
          bloqueadoHasta: null,
          debeCambiar: false,
          pinCambiadoEn: ahora,
        },
      }),
    );
    return { cambiado: true };
  },
});
