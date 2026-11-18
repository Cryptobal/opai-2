import { z } from "zod";

import { defineConsumidor } from "@opai/capabilities";

import { emitir } from "./alertas-art45";
import { ETIQUETA_TIPO, fechaHora, nombreCompleto, tenantBasico } from "./formato";

const payload = z.object({
  marcaId: z.string().uuid(), personaId: z.string().uuid(), instalacionId: z.string().uuid(),
  gpsEstado: z.string(), distanciaM: z.number().nullable().optional(), tipo: z.string(),
});

/** Avisa al empleador (correo/campana vía Comunicaciones) cuando la marca quedó fuera de la geocerca; no bloquea la marca. */
export const consumidorAlertaGeocerca = defineConsumidor({
  id: "asistencia.alerta.geocerca",
  descripcion: "Emite el aviso de marca fuera de geocerca, una vez por marca.",
  eventos: ["asistencia.marca.registrada"],
  async handler(ctx, evento) {
    const p = payload.safeParse(evento.payload);
    if (!p.success || p.data.gpsEstado !== "fuera") return;
    const [persona, inst, marca, t] = await Promise.all([
      ctx.db.persona.findUnique({ where: { id: p.data.personaId }, select: { nombres: true, apellidos: true } }),
      ctx.db.instalacion.findUnique({ where: { id: p.data.instalacionId }, select: { nombre: true } }),
      ctx.db.marca.findUnique({ where: { id: p.data.marcaId }, select: { horaServidor: true } }),
      tenantBasico(ctx),
    ]);
    if (!persona || !inst || !marca) return;
    await emitir(
      ctx, "fuera_geocerca", `geocerca:${p.data.marcaId}`, p.data.personaId, { instalacionId: p.data.instalacionId },
      {
        trabajador: { nombre: nombreCompleto(persona) },
        marca: {
          tipo: ETIQUETA_TIPO[p.data.tipo] ?? p.data.tipo,
          fecha_hora: fechaHora(marca.horaServidor, t.zona),
          distancia_m: p.data.distanciaM == null ? "—" : `${Math.round(p.data.distanciaM)} m`,
        },
        instalacion: { nombre: inst.nombre },
        url: `${ctx.servicios.urlBase}/personas/${p.data.personaId}`,
        empresa: { nombre: t.nombre },
      },
    );
  },
});