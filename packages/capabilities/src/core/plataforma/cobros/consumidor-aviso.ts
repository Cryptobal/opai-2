import { defineConsumidor } from "../../../eventos/consumidores";
import { correoDe } from "../../../integraciones/adaptadores";

const PLANTILLA = "core.cobros.prueba_por_vencer";

/**
 * Correo a los usuarios de plataforma cuando una prueba de módulo vence en siete días (decisión de
 * Carlos, 5-nov-2026). Sin plantilla de empresa: es un aviso interno de OPAI. Idempotente por evento y
 * destinatario (`core.envios`); un fallo de envío queda registrado y no frena el despacho.
 */
export const consumidorAvisoPrueba = defineConsumidor({
  id: "core.cobros.avisar_prueba_por_vencer",
  descripcion:
    "Avisa por correo a los usuarios de plataforma que una prueba de módulo vence en siete días.",
  eventos: [PLANTILLA],
  async handler(ctx, ev) {
    const p = (ev.payload ?? {}) as {
      moduloId?: string;
      pruebaHasta?: string;
      pasaACobro?: boolean;
    };
    if (!p.moduloId) return;
    const [empresa, usuarios] = await Promise.all([
      ctx.db.tenant.findFirst({ where: { id: ctx.tenantId }, select: { nombre: true } }),
      ctx.db.user.findMany({
        where: { platformRole: { not: null } },
        select: { email: true },
        orderBy: { email: "asc" },
      }),
    ]);
    const correo = await correoDe(ctx);
    const destino = p.pasaACobro ? "pasará a cobro" : "quedará en solo lectura";
    const nombre = empresa?.nombre ?? "una empresa";
    for (const { email } of usuarios) {
      const previo = await ctx.db.envio.findFirst({
        where: { eventoId: ev.id, destinatario: email, canal: "correo", estado: "enviado" },
        select: { id: true },
      });
      if (previo) continue;
      const base = {
        tenantId: ctx.tenantId,
        eventoId: ev.id,
        canal: "correo",
        destinatario: email,
        plantillaEvento: PLANTILLA,
      };
      try {
        await correo.enviar({
          para: email,
          asunto: `La prueba de ${p.moduloId} de ${nombre} vence en 7 días`,
          texto:
            `La prueba del módulo ${p.moduloId} de ${nombre} vence el ${p.pruebaHasta ?? "—"}. ` +
            `Al vencer ${destino}. Revísala en Plataforma → Facturación → Pruebas por vencer.`,
        });
        await ctx.db.envio.create({ data: { ...base, estado: "enviado" } });
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : String(error);
        await ctx.db.envio.create({
          data: { ...base, estado: "fallido", error: mensaje.slice(0, 500) },
        });
      }
    }
  },
});
