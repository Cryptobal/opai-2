import { reglaDeNegocio } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";

import type { ResultadoCalculo } from "../domain/motor";
import { fechaCalculoHoy } from "../persistencia/fecha-calculo";
import { huellaJuego, juegoDesactualizado } from "../persistencia/juego-vigente";
import { juegoParaFecha } from "../persistencia/proveedor";

export async function validarEnvioCpq(
  ctx: Contexto,
  input: { confirmarValoresViejos?: boolean | undefined },
  version: { estado: string },
  lineas: readonly { tipo: string; sueldoBaseClp: number | null; huellaJuegoValores: string | null }[],
  resultado: ResultadoCalculo,
  dryRun: boolean,
  cotizacionId: string,
) {
  if (resultado.noEnviable)
    throw reglaDeNegocio("La cotización no se puede enviar: revisa advertencias y costos pendientes.");
  if (resultado.requiereAprobacion && version.estado !== "lista")
    throw reglaDeNegocio("El margen requiere aprobación antes de enviar.");
  const juego = await juegoParaFecha(ctx, fechaCalculoHoy());
  if (juegoDesactualizado(huellaJuego(juego), lineas) && !input.confirmarValoresViejos) {
    throw reglaDeNegocio(
      "Los valores legales cambiaron desde el último cálculo; confirma el envío o recalcula antes.",
    );
  }
  if (input.confirmarValoresViejos && !dryRun) {
    await ctx.transaccion(async (tx) => {
      await ctx.auditoria.registrar(tx, {
        tenantId: ctx.tenantId,
        capability: "cpq.cotizaciones.enviar",
        actor: ctx.actor,
        entityType: "cotizacion",
        entityId: cotizacionId,
        payload: { confirmacion: "valores_viejos", fechaCalculo: fechaCalculoHoy() },
      });
    });
  }
}
