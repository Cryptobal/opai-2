import { comoAgenteInterno, prohibido, type Contexto } from "@opai/capabilities";

import type { Plan } from "./plan";
import { validarContextoAlGuardar } from "./conversaciones-contexto-guardado";
import { guardarTurno } from "./conversaciones-guardado";
import { firmarPlan } from "./planes";
import type { Referencia } from "./referencias";

type Entrada = {
  mensaje: string;
  nivel: "aprobar_todo" | "paso_a_paso";
  conversacionId?: string | undefined;
  contexto?: { tipo: "cuenta" | "instalacion" | "negocio" | "persona"; id: string } | undefined;
  turnoId?: string | undefined;
};

const vacio = {
  conversacionId: null,
  token: null,
  texto: "Solicitará un plan sin ejecutar escrituras.",
  pasos: [],
  tokens: 0,
  accesoSolicitud: null,
  referencias: [] as Referencia[],
};

/** Persiste el turno preparado y firma el plan; dryRun no toca base ni firma. */
export async function salidaTurnoPreparar(
  ctx: Contexto,
  input: Entrada,
  modo: { dryRun: boolean; preparado?: unknown },
  firma: string,
) {
  const delegado = comoAgenteInterno(ctx);
  if (modo.dryRun) return vacio;
  if (!ctx.revalidarAccesoEnTransaccion)
    throw prohibido("No se puede revalidar el acceso al guardar el turno.");
  const accesoSolicitud = await ctx.revalidarAccesoEnTransaccion(ctx.db);
  if (input.contexto) await validarContextoAlGuardar(delegado, input.contexto);
  const plan = modo.preparado as Plan | undefined;
  if (!plan) throw prohibido("No se preparó el turno.");
  const conversacionId = await guardarTurno(ctx, {
    conversacionId: input.conversacionId,
    turnoId: input.turnoId,
    contexto: input.contexto,
    mensaje: input.mensaje,
    texto: plan.texto,
    pasos: plan.pasos.map((p) => p.capacidad),
    referencias: plan.referencias,
  });
  await ctx.revalidarAccesoEnTransaccion(ctx.db);
  return {
    conversacionId,
    token: plan.pasos.length ? firmarPlan(delegado, plan, input.nivel, firma) : null,
    texto: plan.texto,
    pasos: plan.pasos,
    tokens: plan.tokens,
    accesoSolicitud,
    referencias: plan.referencias,
  };
}
