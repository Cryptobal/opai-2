// Captura mensual de indicadores previsionales (CAR-193): lee Previred, renueva o propone; nunca bloquea.
import { enTransaccionCapturaSii, remuneracionesProponerPrevisional } from "@opai/db";
import {
  INDICADORES_PREVIRED, dentroDeBanda, leerPrevired, type IndicadorPrevired, type Lectura, type Vigentes,
} from "@opai/domain";

import type { Contexto } from "../../types";

import { ESQUEMAS_PREVIRED } from "./previsional-esquemas";
import { auditarCapturaPrevisional } from "./previsional-auditoria";
import { primerDiaMes } from "./sii-parse";

export const URL_PREVIRED = "https://www.previred.com/indicadores-previsionales/";
const TIMEOUT_MS = 20_000;

export type ConsultaPrevired = (url: string, signal?: AbortSignal) => Promise<string>;

export const consultaPreviredPorDefecto: ConsultaPrevired = async (url, signal) => {
  const señal = signal ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS);
  const res = await fetch(url, { redirect: "error", signal: señal });
  if (!res.ok) throw new Error(`Previred respondió ${res.status}`);
  return res.text();
};

type Resultado = { clave: IndicadorPrevired; resultado: "ok" | "propuesto" | "fallido"; motivo?: string };

async function vigentesDe(ctx: Contexto): Promise<{ vigentes: Vigentes; ids: Map<string, string> }> {
  const indicadores = await ctx.db.indicadorLegal.findMany({ where: { clave: { in: [...INDICADORES_PREVIRED] } } });
  const ids = new Map(indicadores.map((i) => [i.clave, i.id]));
  const vigente = async (clave: IndicadorPrevired): Promise<unknown> => {
    const id = ids.get(clave);
    if (!id) return undefined;
    return (
      await ctx.db.valorPublicado.findFirst({
        where: { indicadorId: id, estado: "vigente" }, orderBy: { vigenteDesde: "desc" },
      })
    )?.valorJson;
  };
  const [imm, topes, afp, sis, cesantia] = await Promise.all(INDICADORES_PREVIRED.map(vigente));
  const vigentes: Vigentes = {};
  const _imm = ESQUEMAS_PREVIRED.imm.safeParse(imm);
  if (_imm.success) vigentes.imm = _imm.data;
  const _topes = ESQUEMAS_PREVIRED.topes.safeParse(topes);
  if (_topes.success) vigentes.topes = _topes.data;
  const _afp = ESQUEMAS_PREVIRED.afp.safeParse(afp);
  if (_afp.success) vigentes.afp = _afp.data;
  const _sis = ESQUEMAS_PREVIRED.sis.safeParse(sis);
  if (_sis.success) vigentes.sis = _sis.data;
  const _ces = ESQUEMAS_PREVIRED.cesantia.safeParse(cesantia);
  if (_ces.success) vigentes.cesantia = _ces.data;
  return { vigentes, ids };
}

async function registrar(ctx: Contexto, ids: Map<string, string>, r: Resultado, leido: unknown) {
  const indicadorId = ids.get(r.clave);
  if (!indicadorId) return;
  await enTransaccionCapturaSii(ctx.tenantId, (tx) =>
    tx.capturaIndicador.create({
      data: {
        indicadorId, fuenteConsultada: URL_PREVIRED, resultado: r.resultado,
        ...(leido !== undefined ? { valorLeidoJson: JSON.parse(JSON.stringify(leido)) } : {}),
        ...(r.motivo ? { diferencia: r.motivo } : {}),
        alertaEmitida: r.resultado === "fallido",
      },
    }),
  );
}

/**
 * Lee la página de Previred. Coincide con el vigente → se renueva su fecha de consulta; cambió → queda como
 * propuesta para que la apruebe una persona; la fuente falla o la lectura es sospechosa → se conserva el
 * último valor y se deja el aviso. Cada indicador va en su propia transacción: uno que falla no frena al resto.
 */
export async function capturarPrevisional(
  ctx: Contexto,
  opciones: { dia: string; consulta?: ConsultaPrevired; signal?: AbortSignal },
): Promise<Resultado[]> {
  const { vigentes, ids } = await vigentesDe(ctx);
  const html = await (opciones.consulta ?? consultaPreviredPorDefecto)(URL_PREVIRED, opciones.signal).catch(
    () => null,
  );
  const lectura: Lectura = html ? leerPrevired(html, vigentes).lectura : {};
  const resultados: Resultado[] = [];
  for (const clave of INDICADORES_PREVIRED) {
    const leido = lectura[clave];
    const valido = leido === undefined ? null : ESQUEMAS_PREVIRED[clave].safeParse(leido);
    let r: Resultado;
    if (!html) r = { clave, resultado: "fallido", motivo: "fuente_caida" };
    else if (!valido?.success) r = { clave, resultado: "fallido", motivo: "sin_lectura" };
    else if (vigentes[clave] !== undefined && !dentroDeBanda(clave, vigentes[clave], valido.data))
      r = { clave, resultado: "fallido", motivo: "fuera_de_banda" };
    else {
      try {
        const accion = await enTransaccionCapturaSii(ctx.tenantId, async (tx) => {
          const a = await remuneracionesProponerPrevisional(tx, {
            clave, valor: valido.data, vigenteDesde: primerDiaMes(opciones.dia),
            fuente: URL_PREVIRED, consultada: opciones.dia,
          });
          await auditarCapturaPrevisional(ctx, tx, { clave, accion: a, dia: opciones.dia });
          return a;
        });
        r = { clave, resultado: accion === "renovado" ? "ok" : "propuesto" };
      } catch {
        r = { clave, resultado: "fallido", motivo: "publicacion" };
      }
    }
    await registrar(ctx, ids, r, valido?.success ? valido.data : undefined);
    resultados.push(r);
  }
  return resultados;
}
