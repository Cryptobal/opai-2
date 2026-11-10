import { z } from "zod";

import { cafVencido, foliosRestantes } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { escribirConEvento, hoy } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { folioVistaSchema } from "./folios";
import { PERMISO_VENTAS_CONFIGURE, avisosDteDe, folioVista } from "./ventas-comun";

const lectura = (v: ReturnType<typeof folioVista>) =>
  `CAF ${v.tipoDte} · ${v.folioDesde}–${v.folioHasta} · restantes ${v.restantes}${v.activo ? "" : " · pausado"}`;

/**
 * Pausa o reactiva un CAF (CAR-240). Un CAF pausado no entrega folios: la emisión solo usa CAF activos del ambiente de
 * la configuración DTE. No borra ni consume folios; reactivar devuelve el rango tal como estaba.
 */
export const foliosSetActivo = defineCapability({
  id: "finanzas.folios.set_activo",
  descripcion:
    "Pausa o reactiva un rango de folios (CAF). Un CAF pausado no se usa para emitir; reactivarlo lo devuelve tal como estaba. No borra ni consume folios.",
  permiso: PERMISO_VENTAS_CONFIGURE,
  input: z.object({
    folioId: uuidSchema.describe("Rango de folios (CAF) a pausar o reactivar."),
    activo: z.boolean().describe("false pausa el CAF; true lo reactiva."),
  }),
  output: folioVistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const [actual, avisos] = await Promise.all([
      ctx.db.dteFolio.findFirst({ where: { id: input.folioId } }),
      avisosDteDe(ctx),
    ]);
    if (!actual) throw noEncontrado("El rango de folios");
    const hoyIso = hoy();
    if (input.activo && !actual.activo) {
      if (foliosRestantes(actual.folioActual, actual.folioHasta) <= 0) {
        throw reglaDeNegocio("Este CAF ya no tiene folios disponibles; no tiene sentido reactivarlo.");
      }
      if (cafVencido(actual.cafVenceEn?.toISOString().slice(0, 10) ?? null, hoyIso)) {
        throw reglaDeNegocio("Este CAF está vencido; cargue un CAF nuevo en lugar de reactivarlo.");
      }
    }
    const vista = (r: typeof actual) => {
      const v = folioVista(r, { ...avisos, hoyIso });
      return { ...v, lectura: lectura(v) };
    };
    if (dryRun || actual.activo === input.activo) return vista({ ...actual, activo: input.activo });
    const fila = await escribirConEvento<typeof actual>(
      ctx,
      {
        tipo: input.activo ? "finanzas.folios.caf_reactivado" : "finanzas.folios.caf_pausado",
        entidadTipo: "dte_folio",
        payload: () => ({ tipoDte: actual.tipoDte, folioDesde: actual.folioDesde, folioHasta: actual.folioHasta }),
      },
      (tx) => tx.dteFolio.update({ where: { id: actual.id }, data: { activo: input.activo } }),
    );
    return vista(fila);
  },
});
