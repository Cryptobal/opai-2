import { z } from "zod";

import { defineCapability } from "../define";
import { ajuste } from "../core/config";
import { reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_MANAGE, etapaDe, negocioDe, negocioSchema, vistaNegocio } from "./comun";
import { efectosGanarSchema, planGanar } from "./ganar-efectos";
import { aplicarEtapa } from "./transiciones-util";
import { validarEntrada } from "./validaciones";

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
    "IRREVERSIBLE: marca un negocio como ganado (etapa ganada del embudo), validando los requisitos. Devuelve los efectos (R18): la cuenta pasa a cliente activo, se activan las instalaciones, la cotización vigente queda aceptada y cuántos puestos se ofrecerán; la vista previa los muestra sin aplicarlos. Un agente queda en la cola de aprobación humana (R20).",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: negocioSchema.extend({ aviso: z.string().nullable(), efectos: efectosGanarSchema }),
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
    // Los efectos los aplican los consumidores de `comercial.negocio.ganado` (R18, R45); aquí se
    // calculan con el mismo plan para que la vista previa diga exactamente lo que va a pasar.
    const { efectos } = await planGanar(ctx.db, negocio);
    if (dryRun)
      return {
        ...vistaNegocio({ ...negocio, etapaId: ganada.id, estado: "ganado" }),
        aviso,
        efectos,
      };
    const r = await ctx.transaccion((tx) =>
      aplicarEtapa(ctx, tx, negocio, ganada, {
        evento: "comercial.negocio.ganado",
        datos: { ganadoEn: new Date() },
      }),
    );
    return { ...vistaNegocio(r), aviso, efectos };
  },
});
