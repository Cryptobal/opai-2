import type { Contexto } from "../../types";

/** Intenta leer UF/UTM del SII. Sin red o parseo fallido, registra captura fallida sin inventar valores. */
export async function capturarUfUtmSii(ctx: Contexto): Promise<void> {
  const indicadores = await ctx.db.indicadorLegal.findMany({ where: { clave: { in: ["uf", "utm"] } } });
  for (const ind of indicadores) {
    const fuente =
      ind.clave === "uf"
        ? "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm"
        : "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm";
    let resultado = "fallido";
    let valorLeido: unknown = null;
    try {
      const res = await fetch(fuente, { signal: AbortSignal.timeout(15_000) });
      if (res.ok) {
        const html = await res.text();
        valorLeido = ind.clave === "uf" ? extraerUf(html) : extraerUtm(html);
        if (valorLeido != null) resultado = "ok";
      }
    } catch {
      resultado = "fallido";
    }
    await ctx.db.capturaIndicador.create({
      data: {
        indicadorId: ind.id,
        fuenteConsultada: fuente,
        ...(valorLeido != null ? { valorLeidoJson: valorLeido as object } : {}),
        resultado,
        alertaEmitida: resultado !== "ok",
      },
    });
  }
}

function extraerUf(html: string): number | null {
  const m = html.match(/[\d.]+,\d{2}/);
  if (!m) return null;
  const n = Number(m[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function extraerUtm(html: string): number | null {
  const m = html.match(/UTM[^0-9]*(\d[\d.]*)/i);
  if (!m) return null;
  const n = Number(m[1]!.replace(/\./g, ""));
  return Number.isFinite(n) ? n : null;
}
