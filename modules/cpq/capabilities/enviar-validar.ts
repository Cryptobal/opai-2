import { reglaDeNegocio } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";

import { BLOQUEO_ENVIO_MUTUAL, type ResultadoCalculo } from "../domain/motor";
import { mutualBloqueaEnvio } from "../persistencia/avisos-calculo";
import { fechaCalculoHoy } from "../persistencia/fecha-calculo";
import { entradaEstadoFicha } from "../persistencia/requisitos";
import { bloqueosParaLista } from "../domain/estado-ficha";

export async function validarEnvioCpq(
  ctx: Contexto,
  input: { confirmarValoresViejos?: boolean | undefined },
  version: { estado: string },
  lineas: readonly { tipo: string; habilitada: boolean; sueldoBaseClp: number | null; huellaJuegoValores: string | null }[],
  resultado: ResultadoCalculo,
  dryRun: boolean,
  cotizacionId: string,
) {
  // Mismos requisitos que «Dejar lista» (CAR-192). Una versión lista ya tiene su margen aprobado y
  // congelado: no se vuelve a pedir; los valores legales que cambiaron se confirman al enviar.
  const entrada = await entradaEstadoFicha(ctx, version, lineas, resultado);
  const bloqueos = bloqueosParaLista({
    ...entrada,
    margenBajo: entrada.margenBajo && version.estado !== "lista",
  }).filter((b) => b.codigo !== "desactualizada" || !input.confirmarValoresViejos);
  if (bloqueos.length)
    throw reglaDeNegocio(`La cotización no se puede enviar. ${bloqueos.map((b) => b.mensaje).join(" ")}`, {
      codigo: bloqueos[0]!.codigo,
    });
  if (mutualBloqueaEnvio(resultado)) throw reglaDeNegocio(BLOQUEO_ENVIO_MUTUAL, { codigo: "mutual_sin_confirmar" });
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
