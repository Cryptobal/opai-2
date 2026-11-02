import type { TenantTx } from "@opai/db";

import type { Contexto } from "../../types";

import { publicarValorPlataformaEnTx } from "./publicar-plataforma";
import { primerDiaMes, urlSiiUf, urlSiiUtm, ufCentavosDelDia, utmClpDelMes } from "./sii-parse";
import { fuenteEsSii, valorEnRango, variacionPermitida } from "./sii-validacion";
import { fechaCivil } from "./comun";

type IndicadorCaptura = { id: string; clave: string };

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

export async function registrarCapturasOmitidasPorLock(
  tx: TenantTx,
  indicadores: IndicadorCaptura[],
  anio: number,
): Promise<void> {
  for (const ind of indicadores) {
    const clave = ind.clave as "uf" | "utm";
    const fuente = clave === "uf" ? urlSiiUf(anio) : urlSiiUtm(anio);
    await tx.capturaIndicador.create({
      data: {
        indicadorId: ind.id,
        fuenteConsultada: fuente,
        resultado: "omitido",
        diferencia: "lock_captura",
        alertaEmitida: true,
      },
    });
  }
}

export async function registrarCapturasSiiEnTx(
  ctx: Contexto,
  tx: TenantTx,
  indicadores: IndicadorCaptura[],
  opciones: {
    dia: string;
    anio: number;
    mes: number;
    htmlUf: string | null;
    htmlUtm: string | null;
    consultadaEn: Date;
  },
): Promise<void> {
  const { dia, anio, mes, htmlUf, htmlUtm, consultadaEn } = opciones;
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
      } else if (anterior.vigenteDesde != null && vigenteDesde < anterior.vigenteDesde) {
        motivoFallo = "vigencia_anterior";
      } else if (anterior.valor != null && !variacionPermitida(clave, valorLeido, anterior.valor)) {
        motivoFallo = "variacion";
      } else {
        publicadoId = await publicarValorPlataformaEnTx(ctx, tx, {
          clave,
          valorJson: valorLeido,
          vigenteDesde,
          fuente,
          consultadaEn,
          valorAnterior: anterior.valor,
        });
        resultado = "ok";
      }
    } catch {
      motivoFallo = motivoFallo ?? "publicacion";
      resultado = "fallido";
    }

    await tx.capturaIndicador.create({
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
}
