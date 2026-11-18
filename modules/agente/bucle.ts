import { randomUUID } from "node:crypto";

import { executeCapability, prohibido, type Contexto, type Resultado } from "@opai/capabilities";
import type { Mensaje, RespuestaConversacion, SolicitudConversacion } from "@opai/integrations";

import { herramientasDelAgente } from "./herramientas";
import { GUIA, esquemasADemanda, indiceDelAgente } from "./herramientas-demanda";
import { type Paso, type Plan } from "./plan";
import {
  debeDibujarFichas,
  enlazarTitulos,
  textoRespaldoFichas,
  type Referencia,
} from "./referencias";
import { sistema } from "./sistema";
import { aplicarLlamadas } from "./turno-herramientas";

export type { Paso, Plan } from "./plan";
export type Conversador = { conversar(s: SolicitudConversacion): Promise<RespuestaConversacion> };
const MAX_PASOS = 12;
const MAX_TOKENS = 128_000;

/** El borde comprueba sesión y acceso actuales; un contexto antiguo no acredita vigencia. */
export async function revalidarAccesoDelTurno(ctx: Contexto): Promise<string> {
  if (!ctx.revalidarAccesoSolicitud)
    throw prohibido("No se pudo revalidar el acceso. Inicia una nueva solicitud.");
  return ctx.revalidarAccesoSolicitud();
}

function exigirAgente(ctx: Contexto) {
  if (
    ctx.actor.tipo !== "agent" ||
    !ctx.actor.interno ||
    !ctx.modulosActivos.includes("agente") ||
    !ctx.autorizar("agente:usar")
  ) {
    throw prohibido("Sin acceso al agente interno.");
  }
}

/** El modelo nunca recibe una función que escriba: aquí solo se ejecutan lecturas y dryRun. */
export async function prepararTurno(
  ctx: Contexto,
  texto: string,
  ia: Conversador,
  historial: Mensaje[] = [],
): Promise<Plan> {
  exigirAgente(ctx);
  const mensajes: Mensaje[] = [
    { rol: "sistema", texto: `${sistema()}\n\n${GUIA}\n\n${indiceDelAgente(ctx)}` },
    ...historial,
    { rol: "usuario", texto },
  ];
  const plan: Plan = { id: randomUUID(), pasos: [], texto: "", tokens: 0, referencias: [] };
  const refs = new Map<string, Referencia>();
  const cargadas = new Set<string>();
  const llamadas = { n: 0 };
  const cerrar = (): Plan => {
    const lista = [...refs.values()];
    plan.referencias = lista;
    let out = enlazarTitulos(plan.texto, lista);
    if (debeDibujarFichas(texto, lista)) out = textoRespaldoFichas(out, lista);
    plan.texto = out;
    return plan;
  };
  for (let turno = 0; turno < MAX_PASOS; turno++) {
    if (plan.tokens >= MAX_TOKENS) break;
    const r = await unTurnoModelo(ctx, mensajes, plan, ia);
    if (!r.llamadas.length) return cerrar();
    await aplicarLlamadas(ctx, r, mensajes, plan, refs, cargadas, llamadas, revalidarAccesoDelTurno);
  }
  throw prohibido("Se alcanzó el límite del turno; acota la solicitud.");
}

async function unTurnoModelo(
  ctx: Contexto,
  mensajes: Mensaje[],
  plan: Plan,
  ia: Conversador,
): Promise<RespuestaConversacion> {
  await revalidarAccesoDelTurno(ctx);
  const inicio = Date.now();
  const finalizar = await ctx.medidor.preparar?.({
    tenantId: ctx.tenantId,
    recurso: "capacidad.ejecucion",
    unidad: "llamada",
    cantidad: 1,
    modulo: "agente",
    capability: "agente.turno.preparar",
      actorTipo: "agent",
      actorId: ctx.actor.id ?? null,
      viaUserId: ctx.actor.viaUserId ?? null,
      apiKeyId: null,
      portal: ctx.portal,
  });
  let r: RespuestaConversacion;
  try {
    r = await ia.conversar({
      mensajes,
      herramientas: esquemasADemanda(),
      maxTokens: Math.min(2_000, MAX_TOKENS - plan.tokens),
    });
    await finalizar?.({ ok: true, duracionMs: Date.now() - inicio });
  } catch (error) {
    await finalizar?.({ ok: false, duracionMs: Date.now() - inicio });
    throw error;
  }
  await revalidarAccesoDelTurno(ctx);
  plan.tokens += r.uso.tokensEntrada + r.uso.tokensSalida;
  plan.texto = r.texto;
  if (plan.tokens > MAX_TOKENS) throw prohibido("Se alcanzó el límite de tokens del turno.");
  mensajes.push({
    rol: "asistente",
    texto: r.texto,
    llamadas: r.llamadas,
    ...(r.continuidad ? { continuidad: r.continuidad } : {}),
  });
  return r;
}

/** Solo la capacidad humana de confirmación llama esto con un paso guardado por el servidor. */
export async function ejecutarPaso(ctx: Contexto, paso: Paso): Promise<Resultado> {
  if (ctx.actor.tipo !== "agent" || !ctx.actor.interno)
    throw prohibido("Requiere identidad del agente interno.");
  const h = herramientasDelAgente(ctx).find((h) => h.capacidad.id === paso.capacidad);
  if (!h || h.capacidad.efecto === "lectura") {
    return { ok: false, error: { code: "FORBIDDEN", message: "Sin permiso." } };
  }
  const previo = await executeCapability(ctx, paso.capacidad, paso.argumentos, { dryRun: true });
  if (!previo.ok) return previo;
  return executeCapability(ctx, paso.capacidad, paso.argumentos, { idempotencyKey: paso.clave });
}