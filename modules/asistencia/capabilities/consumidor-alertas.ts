import { z } from "zod";

import { defineConsumidor, enviarCorreo } from "@opai/capabilities";

import { alertarSinCorreo } from "./consumidores";
import { nombreCompleto, tenantBasico } from "./formato";

const payload = z.object({ personaId: z.string().uuid(), tipo: z.string() }).passthrough();

/**
 * Envía las alertas del art. 45 al correo personal del trabajador, con copia al empleador (los usuarios
 * owner y admin de la empresa). Sin correo personal, alerta al empleador. Idempotente por evento.
 */
export const consumidorAlertas = defineConsumidor({
  id: "asistencia.alertas",
  descripcion: "Envía al trabajador las alertas de falta de marca y el aviso de horas compensables, con copia al empleador.",
  eventos: ["asistencia.alerta.sin_marca_inicio", "asistencia.alerta.sin_marca_termino", "asistencia.aviso.compensables"],
  async handler(ctx, evento) {
    const p = payload.safeParse(evento.payload);
    if (!p.success) return;
    const d = p.data as Record<string, unknown>;
    const persona = await ctx.db.persona.findUnique({ where: { id: p.data.personaId }, select: { nombres: true, apellidos: true, emailPersonal: true } });
    if (!persona) return;
    const t = await tenantBasico(ctx);
    const correo = persona.emailPersonal?.trim();
    if (!correo) return alertarSinCorreo(ctx, p.data.personaId, nombreCompleto(persona), new Date().toISOString().slice(0, 10));
    if ((await ctx.db.envio.count({ where: { eventoId: evento.id, estado: "enviado" } })) > 0) return;
    const empleador = await ctx.db.membership.findMany({
      where: { estado: "activa", rol: { in: ["owner", "admin"] } }, select: { userId: true },
    });
    const cc = (await ctx.db.user.findMany({ where: { id: { in: empleador.map((m) => m.userId) } }, select: { email: true } })).map((u) => u.email);
    const enviado = await enviarCorreo(
      { db: ctx.db, tenantId: ctx.tenantId, correo: ctx.servicios.correo, urlBase: ctx.servicios.urlBase, eventoId: evento.id },
      evento.tipo, correo,
      { ...d, trabajador: { nombre: nombreCompleto(persona) }, empresa: { nombre: t.nombre }, url: `${ctx.servicios.urlBase}/mis-marcas` },
      { cc },
    );
    if (!enviado) throw new Error("No se pudo enviar la alerta; se reintenta.");
  },
});
