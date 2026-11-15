import { entradaCatalogo } from "@opai/domain";

import { defineConsumidor } from "../../../eventos/consumidores";
import { correoDe } from "../../../integraciones/adaptadores";
import { enviarCorreo } from "../../comunicaciones/envio";

const COMUNICABLE = "core.modulo.prueba_por_vencer";
/** Roles que reciben el aviso: quienes deciden contratar (ADR-071, adenda 7.3). */
const ROLES_AVISO = ["owner", "admin"];

const fechaCorta = (iso: string | undefined) => {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : (iso ?? "—");
};

/**
 * Aviso a la empresa de que la prueba de un módulo está por vencer (decisión de Carlos del 12-nov-2026):
 * a los dueños y administradores activos, con la plantilla de la empresa. Las pruebas que abre
 * Plataforma avisan a 7 días (`core.cobros.prueba_por_vencer`, que también avisa a Plataforma) y la
 * prueba gratis a 2 días (`core.prueba_gratis.por_vencer`). Idempotente por evento y destinatario.
 */
export const consumidorAvisoPruebaEmpresa = defineConsumidor({
  id: "core.cobros.avisar_empresa_prueba_por_vencer",
  descripcion:
    "Avisa por correo a los dueños y administradores de la empresa que una prueba de módulo vence pronto.",
  eventos: ["core.cobros.prueba_por_vencer", "core.prueba_gratis.por_vencer"],
  async handler(ctx, ev) {
    const p = (ev.payload ?? {}) as {
      moduloId?: string;
      pruebaHasta?: string;
      hasta?: string;
      pasaACobro?: boolean;
      dias?: number;
    };
    if (!p.moduloId) return;
    const gratis = ev.tipo === "core.prueba_gratis.por_vencer";
    const miembros = await ctx.db.membership.findMany({
      where: { tenantId: ctx.tenantId, estado: "activa", rol: { in: ROLES_AVISO } },
      select: { user: { select: { email: true } } },
    });
    const empresa = await ctx.db.tenant.findFirst({
      where: { id: ctx.tenantId },
      select: { nombre: true },
    });
    const datos = {
      modulo: { nombre: entradaCatalogo(p.moduloId)?.nombre ?? p.moduloId },
      vence: fechaCorta(p.pruebaHasta ?? p.hasta),
      dias: p.dias ?? (gratis ? 2 : 7),
      despues: p.pasaACobro ? "pasará a cobro" : "quedará en solo lectura",
      empresa: { nombre: empresa?.nombre ?? "" },
      url: `${ctx.servicios.urlBase}/configuracion/modulos`,
    };
    const correo = await correoDe(ctx);
    const correos = [...new Set(miembros.map((m) => m.user.email).filter(Boolean))].sort();
    for (const email of correos) {
      const previo = await ctx.db.envio.findFirst({
        where: {
          eventoId: ev.id,
          destinatario: email,
          canal: "correo",
          plantillaEvento: COMUNICABLE,
          estado: { in: ["enviado", "omitido"] },
        },
        select: { id: true },
      });
      if (previo) continue;
      const destino = {
        db: ctx.db,
        tenantId: ctx.tenantId,
        correo,
        urlBase: ctx.servicios.urlBase,
      };
      await enviarCorreo({ ...destino, eventoId: ev.id }, COMUNICABLE, email, datos);
    }
  },
});
