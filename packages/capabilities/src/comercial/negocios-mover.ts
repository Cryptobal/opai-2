import { z } from "zod";

import { defineCapability } from "../define";
import { ajuste } from "../core/config";
import { reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { etiquetaRequisito, requisitosFaltantes } from "./dominio";
import { PERMISO_MANAGE, etapaDe, negocioDe, negocioSchema, vistaNegocio } from "./comun";
import { aplicarEtapa } from "./transiciones-util";

/** Valida los requisitos de entrada de la etapa y, para salir de la primera, que haya ≥1 instalación. */
async function validarEntrada(
  ctx: Parameters<typeof negocioDe>[0],
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
) {
  const faltan = requisitosFaltantes(destino.exige, negocio);
  if (faltan.length) {
    throw reglaDeNegocio(
      `Faltan requisitos para esta etapa: ${faltan.map(etiquetaRequisito).join(", ")}.`,
    );
  }
  const actual = await etapaDe(ctx, negocio.etapaId);
  // R10: para salir de la primera etapa (orden 0) hacia adelante debe tener ≥1 instalación.
  if (actual.orden === 0 && destino.orden > 0) {
    const n = await ctx.db.negocioInstalacion.count({ where: { negocioId: negocio.id } });
    if (n === 0)
      throw reglaDeNegocio("Vincula al menos una instalación antes de avanzar la etapa.");
  }
}

export const negociosMover = defineCapability({
  id: "comercial.negocios.mover",
  descripcion:
    "Mueve un negocio a otra etapa abierta del embudo validando los requisitos de entrada; retroceder siempre se permite. Ganar o perder van en sus propias acciones.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema, etapaId: uuidSchema }),
  output: negocioSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.id);
    const destino = await etapaDe(ctx, input.etapaId);
    if (destino.embudoId !== negocio.embudoId) {
      throw reglaDeNegocio("La etapa no pertenece al embudo del negocio.");
    }
    if (destino.tipo !== "abierta") {
      throw reglaDeNegocio(
        "Para ganar usa «Ganar» y para perder usa «Perder», con sus requisitos.",
      );
    }
    if (negocio.estado !== "abierto") {
      throw reglaDeNegocio("Un negocio cerrado se reabre antes de moverlo.");
    }
    const actual = await etapaDe(ctx, negocio.etapaId);
    const avanza = destino.orden > actual.orden;
    if (avanza) await validarEntrada(ctx, negocio, destino);
    if (dryRun) return vistaNegocio({ ...negocio, etapaId: destino.id, estado: "abierto" });
    const r = await ctx.transaccion((tx) =>
      aplicarEtapa(ctx, tx, negocio, destino, { evento: "comercial.negocio.etapa_cambiada" }),
    );
    return vistaNegocio(r);
  },
});

export const negociosGanar = defineCapability({
  id: "comercial.negocios.ganar",
  descripcion:
    "IRREVERSIBLE: marca un negocio como ganado (etapa ganada del embudo), validando los requisitos. Un agente queda en la cola de aprobación humana (R18, R20).",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: negocioSchema.extend({ aviso: z.string().nullable() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.id);
    // R20: desde la perdida solo se sale reabriendo; ganar parte siempre de un negocio abierto.
    if (negocio.estado !== "abierto") {
      throw reglaDeNegocio("Solo se gana un negocio abierto; uno perdido se reabre antes.");
    }
    const ganada = await ctx.db.etapa.findFirst({
      where: { embudoId: negocio.embudoId, tipo: "ganada" },
    });
    if (!ganada) throw reglaDeNegocio("El embudo no tiene etapa ganada.");
    // Requisitos de la etapa ganada y R10 (≥1 instalación para salir de la primera etapa).
    await validarEntrada(ctx, negocio, ganada);
    // «Ganar sin cotización» habilitado mientras no exista CPQ (decisión de Carlos 26-oct): el ajuste
    // comercial.ganar_exige_cotizacion lo apaga por empresa; el aviso se puede silenciar aparte.
    const sinCotizacion = !negocio.cotizacionEnviadaEn;
    // Sin .catch: si el ajuste no se puede leer, falla cerrado (no se gana) en vez de asumir «no exige».
    const exige = await ajuste<boolean>(ctx, "comercial", "ganar_exige_cotizacion");
    if (sinCotizacion && exige)
      throw reglaDeNegocio("Esta empresa exige una cotización enviada para ganar.");
    const avisar = await ajuste<boolean>(ctx, "comercial", "avisar_ganar_sin_cotizacion").catch(
      () => true,
    );
    const aviso = sinCotizacion && avisar ? "Se gana sin cotización enviada." : null;
    if (dryRun)
      return { ...vistaNegocio({ ...negocio, etapaId: ganada.id, estado: "ganado" }), aviso };
    const r = await ctx.transaccion((tx) =>
      aplicarEtapa(ctx, tx, negocio, ganada, {
        evento: "comercial.negocio.ganado",
        datos: { ganadoEn: new Date() },
      }),
    );
    return { ...vistaNegocio(r), aviso };
  },
});
