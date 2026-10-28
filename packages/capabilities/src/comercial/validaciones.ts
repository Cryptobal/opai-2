import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { etapaDe } from "./comun";
import { etiquetaRequisito, requisitosFaltantes } from "./dominio";

/** La cuenta existe en esta empresa (la RLS ya acota la búsqueda al tenant). */
export async function cuentaValida(ctx: Contexto, cuentaId: string) {
  const c = await ctx.db.cuenta.findUnique({ where: { id: cuentaId }, select: { id: true } });
  if (!c) throw noEncontrado("La cuenta");
}

/** El responsable es un usuario con membresía activa en esta empresa (core.users es global). */
export async function responsableValido(ctx: Contexto, userId: string | null | undefined) {
  if (!userId) return;
  const m = await ctx.db.membership.findFirst({
    where: { userId, estado: "activa" },
    select: { id: true },
  });
  if (!m) throw noEncontrado("El responsable");
}

/** Evento `comercial.negocio.actualizado` por outbox, en la transacción de la capacidad. */
export async function emitirActualizado(
  ctx: Contexto,
  negocioId: string,
  payload: Record<string, unknown>,
) {
  await ctx.transaccion(async (tx) => {
    await ctx.eventos.emitir(tx, {
      tipo: "comercial.negocio.actualizado",
      entidadTipo: "negocio",
      entidadId: negocioId,
      payload,
    });
  });
}

/** Valida los requisitos de entrada de la etapa y, para salir de la primera, que haya ≥1 instalación. */
export async function validarEntrada(
  ctx: Contexto,
  negocio: {
    id: string;
    etapaId: string;
    montoEstimadoMensual: number | null;
    valorMensual: number | null;
    cierreEstimado: Date | null;
    cotizacionEnviadaEn: Date | null;
    inicioServicioEstimado: Date | null;
    motivoPerdidaId: string | null;
    embudoId: string;
  },
  destino: { exige: string[]; orden: number },
  /** Orden de origen si no es la etapa actual (reabrir parte «desde la primera»). */
  origenOrden?: number,
) {
  const faltan = requisitosFaltantes(destino.exige, negocio);
  if (faltan.length) {
    throw reglaDeNegocio(
      `Faltan requisitos para esta etapa: ${faltan.map(etiquetaRequisito).join(", ")}.`,
    );
  }
  const desde = origenOrden ?? (await etapaDe(ctx, negocio.etapaId)).orden;
  // R10: para salir de la primera etapa (orden 0) hacia adelante debe tener ≥1 instalación.
  if (desde === 0 && destino.orden > 0) {
    const n = await ctx.db.negocioInstalacion.count({ where: { negocioId: negocio.id } });
    if (n === 0)
      throw reglaDeNegocio("Vincula al menos una instalación antes de avanzar la etapa.");
  }
}
