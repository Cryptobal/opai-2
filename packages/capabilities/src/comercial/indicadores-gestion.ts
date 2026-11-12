// Indicadores de gestión que Comercial publica en el catálogo del núcleo (CAR-308, ADR-094). Se
// atribuyen al usuario responsable del negocio o de la solicitud, y la fecha que manda es la del
// hecho que esa persona controla: cuándo se ganó o se perdió el negocio, o cuándo se atendió la
// solicitud. Usan el mismo monto que los informes de cierre (`montoMensual`).
import { porcentajeDe } from "@opai/domain";

import {
  defineIndicador,
  type ConsultaIndicador,
  type IndicadorGestion,
  type MedicionIndicador,
} from "../indicadores-gestion";
import type { Contexto } from "../types";
import { montoMensual } from "./informes-calculo";
import { horasPrimeraRespuesta } from "./solicitudes-comun";
import { plazoPrimeraRespuesta } from "./solicitudes-plazo";

const NEGOCIOS = "comercial:negocios.read";
const SOLICITUDES = "comercial:solicitudes.read";

const deSujetos = (sujetos: readonly string[] | undefined) =>
  sujetos ? { in: [...sujetos] } : { not: null };

async function ganados(ctx: Contexto, { rango, sujetos }: ConsultaIndicador) {
  return ctx.db.negocio.findMany({
    where: {
      estado: "ganado",
      ganadoEn: { gte: rango.desde, lt: rango.hasta },
      responsableId: deSujetos(sujetos),
    },
    select: { responsableId: true, valorMensual: true, montoEstimadoMensual: true },
  });
}

/** Agrupa por sujeto y reduce cada grupo a su valor. */
function porSujeto<T extends { responsableId: string | null }>(
  filas: readonly T[],
  valor: (grupo: readonly T[]) => number | null,
): MedicionIndicador[] {
  const grupos = new Map<string, T[]>();
  for (const f of filas) {
    if (!f.responsableId) continue;
    grupos.set(f.responsableId, [...(grupos.get(f.responsableId) ?? []), f]);
  }
  return [...grupos].map(([sujetoId, grupo]) => ({ sujetoId, valor: valor(grupo) }));
}

const ventasCerradas = defineIndicador({
  id: "comercial.ventas_cerradas",
  nombre: "Ventas cerradas",
  descripcion:
    "Monto mensual, en pesos, de los negocios que ganó en el período como responsable. Usa el valor de la cotización vigente y, si no hay, el monto estimado.",
  tipo: "resultado",
  unidad: "clp",
  sentido: "mayor",
  sujeto: "usuario",
  metaSugerida: 5_000_000,
  origen: "negocios ganados, su responsable, su fecha de cierre y su valor mensual",
  permiso: NEGOCIOS,
  medir: async (ctx, consulta) =>
    porSujeto(await ganados(ctx, consulta), (g) => g.reduce((total, n) => total + montoMensual(n), 0)),
});

const negociosGanados = defineIndicador({
  id: "comercial.negocios_ganados",
  nombre: "Negocios ganados",
  descripcion: "Cantidad de negocios que ganó en el período como responsable.",
  tipo: "resultado",
  unidad: "cantidad",
  sentido: "mayor",
  sujeto: "usuario",
  metaSugerida: 3,
  origen: "negocios ganados, su responsable y su fecha de cierre",
  permiso: NEGOCIOS,
  medir: async (ctx, consulta) => porSujeto(await ganados(ctx, consulta), (g) => g.length),
});

const cotizacionesGanadas = defineIndicador({
  id: "comercial.cotizaciones_ganadas",
  nombre: "Cotizaciones ganadas",
  descripcion:
    "De los negocios con cotización enviada que se cerraron en el período, qué porcentaje ganó. Los que siguen abiertos no cuentan todavía.",
  tipo: "calidad",
  unidad: "porcentaje",
  sentido: "mayor",
  sujeto: "usuario",
  metaSugerida: 30,
  origen: "negocios con cotización enviada, ganados o perdidos, y su fecha de cierre",
  permiso: NEGOCIOS,
  async medir(ctx, { rango, sujetos }) {
    const periodo = { gte: rango.desde, lt: rango.hasta };
    const cerrados = await ctx.db.negocio.findMany({
      where: {
        cotizacionEnviadaEn: { not: null },
        responsableId: deSujetos(sujetos),
        OR: [
          { estado: "ganado", ganadoEn: periodo },
          { estado: "perdido", perdidoEn: periodo },
        ],
      },
      select: { responsableId: true, estado: true },
    });
    return porSujeto(cerrados, (g) =>
      porcentajeDe(g.filter((n) => n.estado === "ganado").length, g.length),
    );
  },
});

const solicitudesATiempo = defineIndicador({
  id: "comercial.solicitudes_a_tiempo",
  nombre: "Solicitudes atendidas a tiempo",
  descripcion:
    "De las solicitudes (leads) a su cargo que se atendieron en el período, qué porcentaje tuvo su primera respuesta dentro del tiempo objetivo de la empresa, en horas hábiles. Es la misma regla del tablero de Comercial. Sin tiempo objetivo configurado no hay medición; las duplicadas no cuentan.",
  tipo: "oportunidad",
  unidad: "porcentaje",
  sentido: "mayor",
  sujeto: "usuario",
  metaSugerida: 90,
  origen: "solicitudes, su responsable, su fecha de entrada y la de su primera respuesta",
  permiso: SOLICITUDES,
  async medir(ctx, { rango, sujetos, ahora }) {
    const horas = await horasPrimeraRespuesta(ctx);
    if (!(horas > 0)) return [];
    const atendidas = await ctx.db.solicitud.findMany({
      where: {
        responsableId: deSujetos(sujetos),
        duplicadaDeId: null,
        primeraRespuestaEn: { gte: rango.desde, lt: rango.hasta },
      },
      select: { responsableId: true, estado: true, createdAt: true, primeraRespuestaEn: true },
    });
    return porSujeto(atendidas, (g) =>
      porcentajeDe(
        g.filter((s) => plazoPrimeraRespuesta(s, horas, ahora).estado === "a_tiempo").length,
        g.length,
      ),
    );
  },
});

export const indicadoresComercial: readonly IndicadorGestion[] = [
  ventasCerradas,
  negociosGanados,
  cotizacionesGanadas,
  solicitudesATiempo,
];
