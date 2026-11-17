import type { FrecuenciaReporte } from "@opai/domain";

import { enviarCorreo } from "../core/comunicaciones/envio";
import { tenantActual } from "../core/comun";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { configDeInstalacion } from "./config-comun";
import { hoyEmpresa } from "./prerregistro-comun";
import { ventanaReporte } from "./reportes-periodo";

const EVENTO = "acceso.reporte";
const LOTE = 500;

type Fila = {
  horaCorregida: Date;
  tipoRegistro: string;
  nombre: string;
  mascara: string;
  empresa: string | null;
  patente: string | null;
  salida: { horaCorregida: Date } | null;
  anulacion: { id: string } | null;
};

function csvDe(filas: Fila[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const head = "entrada,salida,tipo,nombre,documento,empresa,patente,anulado";
  const filasCsv = filas.map((r) =>
    [
      r.horaCorregida.toISOString(),
      r.salida?.horaCorregida.toISOString() ?? "",
      r.tipoRegistro,
      r.nombre,
      r.mascara,
      r.empresa ?? "",
      r.patente ?? "",
      r.anulacion ? "si" : "no",
    ]
      .map(esc)
      .join(","),
  );
  return [head, ...filasCsv].join("\n");
}

async function registrosDelPeriodo(
  ctx: Contexto,
  instalacionId: string,
  desde: Date,
  hasta: Date,
): Promise<Fila[]> {
  const items: Fila[] = [];
  let cursor: Date | undefined;
  for (;;) {
    const lote = await ctx.db.registroAcceso.findMany({
      where: {
        instalacionId,
        horaCorregida: { gte: desde, lt: hasta, ...(cursor ? { gt: cursor } : {}) },
      },
      orderBy: { horaCorregida: "asc" },
      take: LOTE,
      select: {
        horaCorregida: true,
        tipoRegistro: true,
        nombre: true,
        mascara: true,
        empresa: true,
        patente: true,
        salida: { select: { horaCorregida: true } },
        anulacion: { select: { id: true } },
      },
    });
    if (lote.length === 0) break;
    items.push(...lote);
    if (lote.length < LOTE) break;
    cursor = lote[lote.length - 1]!.horaCorregida;
  }
  return items;
}

async function avanzarCursorReporte(
  ctx: Contexto,
  instalacionId: string,
  frecuencia: FrecuenciaReporte,
  ultimoHasta: Date | null,
) {
  const { timezone } = await tenantActual(ctx);
  const hoy = await hoyEmpresa(ctx);
  const ventana = ventanaReporte(frecuencia, hoy, timezone, ultimoHasta);
  if (!ventana) return;
  await ctx.db.reporteAccesoCursor.upsert({
    where: { tenantId_instalacionId: { tenantId: ctx.tenantId, instalacionId } },
    create: { tenantId: ctx.tenantId, instalacionId, ultimoHasta: ventana.hasta },
    update: { ultimoHasta: ventana.hasta },
  });
}

/** Envía (o simula) el reporte de una instalación y avanza el cursor si corresponde. */
export async function enviarReporteAcceso(
  ctx: Contexto,
  instalacionId: string,
  opts: { prueba?: boolean; frecuencia?: FrecuenciaReporte } = {},
): Promise<{ enviados: number; registros: number; omitido?: string }> {
  const cfg = await configDeInstalacion(ctx, instalacionId);
  const frecuencia = opts.frecuencia ?? cfg.reporteFrecuencia;
  if (frecuencia === "desactivado") return { enviados: 0, registros: 0, omitido: "desactivado" };
  const destinatarios = cfg.reporteDestinatarios;
  if (destinatarios.length === 0) return { enviados: 0, registros: 0, omitido: "sin_destinatarios" };

  const { timezone } = await tenantActual(ctx);
  const hoy = await hoyEmpresa(ctx);
  const cursor = await ctx.db.reporteAccesoCursor.findUnique({ where: { tenantId_instalacionId: { tenantId: ctx.tenantId, instalacionId } } });
  const v = opts.prueba
    ? {
        desde: new Date(Date.now() - 7 * 86_400_000),
        hasta: new Date(),
        periodo: "Prueba (últimos 7 días)",
      }
    : ventanaReporte(frecuencia, hoy, timezone, cursor?.ultimoHasta ?? null);
  if (!v) return { enviados: 0, registros: 0, omitido: "sin_periodo" };

  const inst = await ctx.db.instalacion.findUnique({ where: { id: instalacionId }, select: { nombre: true } });
  if (!inst) throw reglaDeNegocio("Instalación no encontrada.");
  const filas = await registrosDelPeriodo(ctx, instalacionId, v.desde, v.hasta);
  const csv = csvDe(filas);
  const para = destinatarios[0]!;
  const cc = destinatarios.slice(1);
  const asuntoPrueba = opts.prueba ? "[Prueba] " : "";
  const datos = {
    "instalacion.nombre": inst.nombre,
    "reporte.periodo": `${asuntoPrueba}${v.periodo}`,
    "reporte.registros": String(filas.length),
  };
  const ok = await enviarCorreo(
    { db: ctx.db, tenantId: ctx.tenantId, correo: ctx.servicios.correo, urlBase: ctx.servicios.urlBase },
    EVENTO,
    para,
    datos,
    {
      paraAdicionales: cc,
      adjuntos: [
        {
          nombre: "accesos.csv",
          mime: "text/csv",
          contenidoBase64: Buffer.from(csv, "utf8").toString("base64"),
        },
      ],
    },
  );
  if (!ok) return { enviados: 0, registros: filas.length, omitido: "correo_fallido" };
  if (!opts.prueba) await avanzarCursorReporte(ctx, instalacionId, frecuencia, cursor?.ultimoHasta ?? null);
  return { enviados: destinatarios.length, registros: filas.length };
}