import type { Contexto } from "../../types";

import { publicarValorPlataforma } from "./publicar-plataforma";
import {
  primerDiaMes,
  ufCentavosDelDia,
  urlSiiUf,
  urlSiiUtm,
  utmClpDelMes,
} from "./sii-parse";

export type ConsultaSii = (url: string, signal?: AbortSignal) => Promise<string>;

export const consultaSiiPorDefecto: ConsultaSii = async (url, signal) => {
  const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`SII respondió ${res.status}`);
  return res.text();
};

type OpcionesCaptura = {
  dia?: string;
  consulta?: ConsultaSii;
  signal?: AbortSignal;
};

/**
 * Lee UF y UTM solo desde las publicaciones oficiales del SII (www.sii.cl/valores_y_fechas),
 * registra captura y actualiza `core.valores_publicados` (plataforma, todos los tenants).
 */
export async function capturarUfUtmSii(ctx: Contexto, opciones: OpcionesCaptura = {}): Promise<void> {
  const dia = opciones.dia ?? new Date().toISOString().slice(0, 10);
  const consulta = opciones.consulta ?? consultaSiiPorDefecto;
  const anio = Number(dia.slice(0, 4));
  const mes = Number(dia.slice(5, 7));
  const indicadores = await ctx.db.indicadorLegal.findMany({ where: { clave: { in: ["uf", "utm"] } } });

  const htmlUf = await consulta(urlSiiUf(anio), opciones.signal).catch(() => null);
  const htmlUtm = await consulta(urlSiiUtm(anio), opciones.signal).catch(() => null);

  for (const ind of indicadores) {
    const fuente = ind.clave === "uf" ? urlSiiUf(anio) : urlSiiUtm(anio);
    let resultado = "fallido";
    let valorLeido: number | null = null;
    let vigenteDesde = dia;
    let publicadoId: string | null = null;

    try {
      if (ind.clave === "uf" && htmlUf) {
        valorLeido = ufCentavosDelDia(htmlUf, dia);
      } else if (ind.clave === "utm" && htmlUtm) {
        valorLeido = utmClpDelMes(htmlUtm, mes);
        vigenteDesde = primerDiaMes(dia);
      }
      if (valorLeido != null) {
        resultado = "ok";
        const pub = await publicarValorPlataforma(ctx, {
          indicadorId: ind.id,
          valorJson: valorLeido,
          vigenteDesde,
          fuente,
          consultadaEl: dia,
        });
        publicadoId = pub.publicadoId;
      }
    } catch {
      resultado = "fallido";
    }

    await ctx.db.capturaIndicador.create({
      data: {
        indicadorId: ind.id,
        fuenteConsultada: fuente,
        ...(valorLeido != null ? { valorLeidoJson: valorLeido } : {}),
        ...(publicadoId ? { valorVigenteId: publicadoId } : {}),
        resultado,
        alertaEmitida: resultado !== "ok",
      },
    });
  }
}
