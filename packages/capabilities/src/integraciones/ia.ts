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
  type ProveedorIaId,
  proveedorIa,
  type RespuestaConversacion,
  type SolicitudConversacion,
  type SolicitudIa,
  type Uso,
} from "@opai/integrations";

import type { Contexto } from "../types";
import { consumoBase } from "./consumo-base";
import { candidatosIa } from "./ia-candidatos";
import {
  avisarTenantIaFallo,
  type Candidato,
  conRespaldo,
  ErrorRespaldoIa,
  type FalloProveedor,
  finDeCadena,
} from "./ia-respaldo";

/**
 * Mide una llamada: dos filas (entrada y salida). BYOK (propia) se mide pero no se cobra. El
 * proveedor ya cobró estos tokens antes de medirlos: `yaIncurrido` registra siempre el gasto real
 * (nunca se pierde ni se repite sin trazabilidad), aunque supere el tope; la SIGUIENTE llamada del
 * agente recibe `BUDGET_EXCEEDED` en el prepago de `capacidad.ejecucion` (BRIEF-02 §4.9).
 */
function medir(ctx: Contexto, clase: ClaseTarea, modulo: string, c: Candidato, uso: Uso) {
  const comun = {
    ...consumoBase(ctx, modulo),
    unidad: "token",
    sinCosto: c.cred.modalidad === "propia",
    yaIncurrido: true,
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
    // (lanza) o el consumidor cancele (rompe el bucle), y cerramos el iterador subyacente. El evento
    // `uso` trae el parcial acumulado; el `fin`, el total. Como solo medimos una vez (en `finally`
    // con el último valor visto), un corte mide el parcial y un `fin` no lo cuenta dos veces.
    let uso: Uso = { tokensEntrada: 0, tokensSalida: 0 };
    try {
      while (!actual.done) {
        if (actual.value.tipo === "uso") uso = actual.value.uso;
        else if (actual.value.tipo === "fin") uso = actual.value.respuesta.uso;
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
  opciones: { avisar?: boolean } = {},
) {
  const { cands, soloPropias, propiasInutiles } = await candidatosIa(ctx, clase, solo);
  if (cands.length === 0) {
    // El tenant tiene key propia pero ninguna sirve (sin modelo, sin secreto o sin base URL): falla
    // y avisa al tenant; nunca cae a OPAI (t214s684). Sin key propia, no hay IA: se devuelve null.
    if (soloPropias) {
      const fallos: FalloProveedor[] = propiasInutiles.map((p) => ({
        proveedor: p.id,
        error: new ErrorIa(p.id, null, `IA propia inservible: ${p.razon}.`),
      }));
      if (opciones.avisar !== false) await avisarTenantIaFallo(ctx, fallos);
      throw new ErrorRespaldoIa(
        fallos.map((f) => f.proveedor),
        undefined,
      );
    }
    return null;
  }
  const conRetry = !solo;
  // La selección de un proveedor no suprime el aviso; Probar lo gestiona por separado.
  const avisar = opciones.avisar !== false && cands.some((c) => c.cred.modalidad === "propia");
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
