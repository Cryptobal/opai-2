import { tryLockCapturaSiiXact } from "@opai/db";

import type { Contexto } from "../../types";

import {
  registrarCapturasOmitidasPorLock,
  registrarCapturasSiiEnTx,
} from "./sii-captura-persistir";
import { urlSiiUf, urlSiiUtm } from "./sii-parse";

const ZONA_CAPTURA_SII = "America/Santiago";

function hoyCivilEn(zona: string, ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona, dateStyle: "short" }).format(ahora);
}

export type ConsultaSii = (url: string, signal?: AbortSignal) => Promise<string>;

const TIMEOUT_MS = 15_000;

function signalConsulta(externa?: AbortSignal): AbortSignal {
  if (!externa) return AbortSignal.timeout(TIMEOUT_MS);
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(new Error("timeout SII")), TIMEOUT_MS);
  externa.addEventListener(
    "abort",
    () => {
      clearTimeout(timer);
      control.abort(externa.reason);
    },
    { once: true },
  );
  return control.signal;
}

async function leerSii(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { redirect: "manual", signal: signalConsulta(signal) });
  if (res.status >= 300 && res.status < 400) {
    const destino = res.headers.get("location") ?? "";
    if (!/^https:\/\/(www\.)?sii\.cl\//i.test(destino)) {
      throw new Error("Redirección fuera del SII");
    }
    const seguido = await fetch(destino, { signal: signalConsulta(signal) });
    if (!seguido.ok) throw new Error(`SII respondió ${seguido.status}`);
    return seguido.text();
  }
  if (!res.ok) throw new Error(`SII respondió ${res.status}`);
  return res.text();
}

export const consultaSiiPorDefecto: ConsultaSii = leerSii;

type OpcionesCaptura = {
  dia?: string;
  consulta?: ConsultaSii;
  signal?: AbortSignal;
};

/**
 * Lee UF y UTM solo desde el SII, valida y publica en plataforma (escritura serializada con lock transaccional).
 */
export async function capturarUfUtmSii(ctx: Contexto, opciones: OpcionesCaptura = {}): Promise<void> {
  const consultadaEn = new Date();
  const dia = opciones.dia ?? hoyCivilEn(ZONA_CAPTURA_SII, consultadaEn);
  const consulta = opciones.consulta ?? consultaSiiPorDefecto;
  const anio = Number(dia.slice(0, 4));
  const mes = Number(dia.slice(5, 7));
  const indicadores = await ctx.db.indicadorLegal.findMany({
    where: { clave: { in: ["uf", "utm"] } },
  });

  let htmlUf: string | null = null;
  let htmlUtm: string | null = null;
  try {
    htmlUf = await consulta(urlSiiUf(anio), opciones.signal);
    htmlUtm = await consulta(urlSiiUtm(anio), opciones.signal);
  } catch {
    htmlUf = null;
    htmlUtm = null;
  }

  await ctx.transaccion(async (tx) => {
    const locked = await tryLockCapturaSiiXact(tx);
    if (!locked) {
      await registrarCapturasOmitidasPorLock(tx, indicadores, anio);
      return;
    }
    await registrarCapturasSiiEnTx(ctx, tx, indicadores, {
      dia,
      anio,
      mes,
      htmlUf,
      htmlUtm,
      consultadaEn,
    });
  });
}
