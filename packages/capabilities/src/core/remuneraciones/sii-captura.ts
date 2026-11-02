import type { Contexto } from "../../types";

import {
  intentarLockCapturaGlobal,
  liberarLockCapturaGlobal,
  publicarValorPlataforma,
} from "./publicar-plataforma";
import {
  primerDiaMes,
  ufCentavosDelDia,
  urlSiiUf,
  urlSiiUtm,
  utmClpDelMes,
} from "./sii-parse";
import { fuenteEsSii, valorEnRango, variacionPermitida } from "./sii-validacion";
import { fechaCivil } from "./comun";

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

async function valorVigenteAnterior(
  ctx: Contexto,
  indicadorId: string,
): Promise<{ valor: number | null; vigenteDesde: string | null }> {
  const row = await ctx.db.valorPublicado.findFirst({
    where: { indicadorId, estado: "vigente" },
    orderBy: { vigenteDesde: "desc" },
  });
  if (!row) return { valor: null, vigenteDesde: null };
  return { valor: Number(row.valorJson), vigenteDesde: fechaCivil(row.vigenteDesde) };
}

type OpcionesCaptura = {
  dia?: string;
  consulta?: ConsultaSii;
  signal?: AbortSignal;
};

/**
 * Lee UF y UTM solo desde el SII, valida y publica en plataforma (corrida global con lock).
 */
export async function capturarUfUtmSii(ctx: Contexto, opciones: OpcionesCaptura = {}): Promise<void> {
  const locked = await intentarLockCapturaGlobal(ctx);
  if (!locked) return;

  const consultadaEn = new Date();
  try {
    const dia = opciones.dia ?? consultadaEn.toISOString().slice(0, 10);
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

    for (const ind of indicadores) {
      const clave = ind.clave as "uf" | "utm";
      const fuente = clave === "uf" ? urlSiiUf(anio) : urlSiiUtm(anio);
      let resultado = "fallido";
      let valorLeido: number | null = null;
      let vigenteDesde = dia;
      let publicadoId: string | null = null;
      let motivoFallo: string | undefined;

      const anterior = await valorVigenteAnterior(ctx, ind.id);

      try {
        if (clave === "uf" && htmlUf) {
          valorLeido = ufCentavosDelDia(htmlUf, dia);
        } else if (clave === "utm" && htmlUtm) {
          valorLeido = utmClpDelMes(htmlUtm, mes);
          vigenteDesde = primerDiaMes(dia);
        }

        if (valorLeido == null) {
          motivoFallo = "sin_valor_dia";
        } else if (!fuenteEsSii(fuente)) {
          motivoFallo = "fuente";
        } else if (!valorEnRango(clave, valorLeido)) {
          motivoFallo = "rango";
        } else if (
          anterior.vigenteDesde != null &&
          vigenteDesde < anterior.vigenteDesde
        ) {
          motivoFallo = "vigencia_anterior";
        } else if (
          anterior.valor != null &&
          !variacionPermitida(clave, valorLeido, anterior.valor)
        ) {
          motivoFallo = "variacion";
        } else {
          const pub = await publicarValorPlataforma(ctx, {
            clave,
            valorJson: valorLeido,
            vigenteDesde,
            fuente,
            consultadaEn,
            valorAnterior: anterior.valor,
          });
          publicadoId = pub.publicadoId;
          resultado = "ok";
        }
      } catch {
        motivoFallo = motivoFallo ?? "publicacion";
        resultado = "fallido";
      }

      await ctx.db.capturaIndicador.create({
        data: {
          indicadorId: ind.id,
          fuenteConsultada: fuente,
          ...(valorLeido != null ? { valorLeidoJson: valorLeido } : {}),
          ...(publicadoId ? { valorVigenteId: publicadoId } : {}),
          ...(motivoFallo ? { diferencia: motivoFallo } : {}),
          resultado,
          alertaEmitida: resultado !== "ok",
        },
      });
    }
  } finally {
    await liberarLockCapturaGlobal(ctx);
  }
}
