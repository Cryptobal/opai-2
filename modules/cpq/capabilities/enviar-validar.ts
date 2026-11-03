import { reglaDeNegocio } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";

import { BLOQUEO_ENVIO_MUTUAL, type ResultadoCalculo } from "../domain/motor";
import { mutualBloqueaEnvio } from "../persistencia/avisos-calculo";
import { fechaCalculoHoy } from "../persistencia/fecha-calculo";
import { huellaJuego, juegoDesactualizado } from "../persistencia/juego-vigente";
import { juegoParaFecha, mutualParaCalculo } from "../persistencia/proveedor";

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
  if (mutualBloqueaEnvio(resultado)) throw reglaDeNegocio(BLOQUEO_ENVIO_MUTUAL, { codigo: "mutual_sin_confirmar" });
  if (resultado.requiereAprobacion && version.estado !== "lista")
    throw reglaDeNegocio("El margen requiere aprobación antes de enviar.");
  const resuelto = await juegoParaFecha(ctx, fechaCalculoHoy());
  const mutual = await mutualParaCalculo(ctx);
  const desactualizado = juegoDesactualizado(huellaJuego(resuelto.juego), lineas, mutual.confirmada);
  if (desactualizado && !input.confirmarValoresViejos) {
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
