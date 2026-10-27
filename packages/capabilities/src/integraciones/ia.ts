// Resolvedor de IA del núcleo (ADR-031, ADR-049). IA por clase de tarea: el tenant elige proveedor
// y modelo; aquí se arma la cadena de proveedores conectados, se llama por HTTP (sin SDK) y se mide
// cada llamada en `core.consumos` (tokens, proveedor, modelo, clase) sin guardar el prompt ni la
// key. Respaldo: si el proveedor elegido falla por 5xx, 429 o red/timeout, prueba el siguiente que
// el tenant tenga conectado; nunca ante un 4xx de contenido. Si el tenant tiene key propia, el
// respaldo solo usa otras keys propias del mismo tenant: nunca cae a la de OPAI (ver ia-respaldo.ts).
import {
  type ClaseTarea,
  ErrorIa,
  type EventoStream,
  MODELOS_POR_DEFECTO,
  type ProveedorIaId,
  proveedorIa,
  type RespuestaConversacion,
  type SolicitudConversacion,
  type SolicitudIa,
  type Uso,
} from "@opai/integrations";

import { ajuste } from "../core/config/valores";
import type { Contexto } from "../types";
import { consumoBase } from "./consumo-base";
import { type Candidato, conRespaldo, type FalloProveedor, finDeCadena } from "./ia-respaldo";
import { credencialDe, integracionDe } from "./resolver";

const ORDEN_IA: readonly ProveedorIaId[] = [
  "ia_anthropic",
  "ia_openai",
  "ia_google",
  "ia_xai",
  "ia_compatible",
];

type ConfigIa = { modelos?: Partial<Record<ClaseTarea, string>>; baseUrl?: string };

/** Proveedores de IA conectados por el tenant, en orden de preferencia, con modelo resuelto. */
async function candidatosIa(
  ctx: Contexto,
  clase: ClaseTarea,
  solo?: ProveedorIaId,
): Promise<Candidato[]> {
  const plataforma = (
    await ajuste<Record<ClaseTarea, { proveedor: string; modelo: string }>>(ctx, "core", "ia_modelos")
  )[clase];
  const out: Candidato[] = [];
  for (const id of solo ? [solo] : ORDEN_IA) {
    const cred = await credencialDe(ctx, id);
    if (!cred) continue;
    const fila = await integracionDe(ctx, id);
    const config = (fila?.config ?? {}) as ConfigIa;
    const modelo =
      config.modelos?.[clase] ??
      (plataforma?.proveedor === id ? plataforma.modelo : undefined) ??
      MODELOS_POR_DEFECTO[id]?.[clase];
    if (!modelo) continue;
    if (id === "ia_compatible" && !config.baseUrl) continue;
    out.push({ id, modelo, cred, ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}) });
  }
  // Política BYOK (Carlos, 26-oct-2026 21:58 CLT, t214s684): si el tenant tiene key propia, la cadena
  // de respaldo solo usa keys propias; nunca la de OPAI. No aplica al probar un proveedor concreto.
  if (!solo && out.some((c) => c.cred.modalidad === "propia"))
    return out.filter((c) => c.cred.modalidad === "propia");
  return out;
}

/** Mide una llamada: dos filas (entrada y salida). BYOK (propia) se mide pero no se cobra. */
function medir(ctx: Contexto, clase: ClaseTarea, modulo: string, c: Candidato, uso: Uso) {
  const comun = {
    ...consumoBase(ctx, modulo),
    unidad: "token",
    sinCosto: c.cred.modalidad === "propia",
    referenciaTipo: "ia",
    referenciaId: `${c.id}:${c.modelo}`,
  };
  return Promise.all([
    ctx.medidor.registrar({ ...comun, recurso: `ia.${clase}.entrada`, cantidad: uso.tokensEntrada }),
    ctx.medidor.registrar({ ...comun, recurso: `ia.${clase}.salida`, cantidad: uso.tokensSalida }),
  ]).catch(() => undefined);
}

const adaptador = (c: Candidato) =>
  proveedorIa(c.id, c.cred.valor, c.baseUrl !== undefined ? { baseUrl: c.baseUrl } : undefined);

/** Stream con respaldo: solo cae al siguiente proveedor si falla antes del primer evento. */
async function* streamConRespaldo(
  ctx: Contexto,
  clase: ClaseTarea,
  modulo: string,
  cands: readonly Candidato[],
  avisar: boolean,
  s: SolicitudConversacion,
): AsyncGenerator<EventoStream> {
  const fallos: FalloProveedor[] = [];
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i]!;
    const it = adaptador(c).conversarStream(c.modelo, s)[Symbol.asyncIterator]();
    let actual: IteratorResult<EventoStream>;
    try {
      actual = await it.next();
    } catch (e) {
      if (e instanceof ErrorIa) fallos.push({ proveedor: c.id, error: e });
      if (i < cands.length - 1 && e instanceof ErrorIa && e.reintentable) continue;
      throw await finDeCadena(ctx, avisar, fallos, e);
    }
    // Ya respondió este proveedor: medimos el uso conocido en `finally`, aunque el stream se corte
    // (lanza) o el consumidor cancele (rompe el bucle), y cerramos el iterador subyacente.
    let uso: Uso = { tokensEntrada: 0, tokensSalida: 0 };
    try {
      while (!actual.done) {
        if (actual.value.tipo === "fin") uso = actual.value.respuesta.uso;
        yield actual.value;
        actual = await it.next();
      }
    } finally {
      await medir(ctx, clase, modulo, c, uso);
      await it.return?.(undefined).catch(() => undefined);
    }
    return;
  }
  throw new Error("Sin proveedores de IA.");
}

/** IA por clase de tarea (ADR-031): proveedor propio configurado, si no el de plataforma. */
export async function iaDe(
  ctx: Contexto,
  clase: ClaseTarea,
  modulo = "core",
  solo?: ProveedorIaId,
) {
  const cands = await candidatosIa(ctx, clase, solo);
  if (cands.length === 0) return null;
  const conRetry = !solo;
  // Avisar solo en la cadena de respaldo (no al probar un proveedor concreto) y solo con keys propias.
  const avisar = conRetry && cands.some((c) => c.cred.modalidad === "propia");
  const ejecutar = async <T>(fn: (c: Candidato) => Promise<T>): Promise<T> => {
    const fallos: FalloProveedor[] = [];
    try {
      return await conRespaldo(cands, conRetry, fallos, fn);
    } catch (e) {
      throw await finDeCadena(ctx, avisar, fallos, e);
    }
  };
  return {
    proveedor: cands[0]!.id,
    modelo: cands[0]!.modelo,
    completar: (s: SolicitudIa) =>
      ejecutar(async (c) => {
        const r = await adaptador(c).completar(c.modelo, s);
        await medir(ctx, clase, modulo, c, { tokensEntrada: r.tokensEntrada, tokensSalida: r.tokensSalida });
        return r;
      }),
    conversar: (s: SolicitudConversacion): Promise<RespuestaConversacion> =>
      ejecutar(async (c) => {
        const r = await adaptador(c).conversar(c.modelo, s);
        await medir(ctx, clase, modulo, c, r.uso);
        return r;
      }),
    conversarStream: (s: SolicitudConversacion): AsyncIterable<EventoStream> =>
      streamConRespaldo(ctx, clase, modulo, cands, avisar, s),
  };
}
