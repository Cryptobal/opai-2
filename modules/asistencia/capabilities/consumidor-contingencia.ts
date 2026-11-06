import { z } from "zod";

import { defineConsumidor, enviarCorreo } from "@opai/capabilities";

import { ETIQUETA_TIPO, fechaHora, nombreCompleto, tenantBasico } from "./formato";
import { alertarSinCorreo } from "./consumidores";

const payload = z.object({ contingenciaId: z.string().uuid(), personaId: z.string().uuid() });

/** Avisa al trabajador, en su correo personal, que se propuso una marca de contingencia a su nombre. */
export const consumidorAvisoContingencia = defineConsumidor({
  id: "asistencia.contingencia.aviso",
  descripcion: "Avisa al trabajador, en su correo personal, de una marca de contingencia por aceptar u objetar.",
  eventos: ["asistencia.contingencia.propuesta"],
  async handler(ctx, evento) {
    const p = payload.safeParse(evento.payload);
    if (!p.success) return;
    const [c, persona, t] = await Promise.all([
      ctx.db.contingencia.findUnique({ where: { id: p.data.contingenciaId } }),
      ctx.db.persona.findUnique({ where: { id: p.data.personaId }, select: { nombres: true, apellidos: true, emailPersonal: true } }),
      tenantBasico(ctx),
    ]);
    if (!c || !persona) return;
    const correo = persona.emailPersonal?.trim();
    if (!correo) return alertarSinCorreo(ctx, p.data.personaId, nombreCompleto(persona), c.createdAt.toISOString().slice(0, 10));
    if ((await ctx.db.envio.count({ where: { eventoId: evento.id, estado: "enviado" } })) > 0) return;
    const enviado = await enviarCorreo(
      { db: ctx.db, tenantId: ctx.tenantId, correo: ctx.servicios.correo, urlBase: ctx.servicios.urlBase, eventoId: evento.id },
      "asistencia.contingencia.propuesta", correo,
      {
        trabajador: { nombre: nombreCompleto(persona) },
        contingencia: { tipo: ETIQUETA_TIPO[c.tipo] ?? c.tipo, hora: fechaHora(c.horaDeclarada, t.zona), motivo: c.motivo },
        empresa: { nombre: t.nombre },
        url: `${ctx.servicios.urlBase}/mis-marcas`,
      },
    );
    if (!enviado) throw new Error("No se pudo avisar de la contingencia; se reintenta.");
  },
});
