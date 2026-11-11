// Compras desde el RCV del SII (CAR-273, paridad con `finance-rcv-sync` de OPAI 1). Trae las facturas que el SII
// registra como recibidas por la empresa y las deja en el libro de compras sin duplicar. Solo lectura del SII: el
// candado de ambiente de CAR-191 rige la emisión y la cesión, no esta consulta (ADR-089).
import { z } from "zod";

import { consultarRcvCompras, ErrorProveedorSii, type DocumentoRcv } from "@opai/integrations";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { consumoBase } from "../integraciones/consumo-base";
import { defineTrabajo } from "../trabajos/registro";
import type { Contexto } from "../types";
import { credencialesSimpleApi } from "./adaptador-sii";
import { PERMISO_COMPRAS } from "./comun";
import { importarDocumentosCompra, type FilaCompra, type ResultadoImportacion } from "./compras-importar-nucleo";

const TIPOS = new Set([33, 34, 56, 61]);

/** Año y mes de hoy en Chile (el RCV es mensual y el mes lo define la hora local). */
export function mesChile(ahora = new Date()): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" })
    .format(ahora)
    .split("-")
    .map(Number);
  return { anio: anio ?? 1970, mes: mes ?? 1, dia: dia ?? 1 };
}

/** El trabajo diario consulta un solo mes: el anterior los 3 primeros días (cierra el mes) y si no el actual. */
export function mesDelTrabajo(ahora = new Date()): { anio: number; mes: number } {
  const { anio, mes, dia } = mesChile(ahora);
  if (dia > 3) return { anio, mes };
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

const aFila = (d: DocumentoRcv): FilaCompra => ({
  proveedorRut: d.rutEmisor,
  ...(d.razonSocial ? { proveedorRazonSocial: d.razonSocial.slice(0, 160) } : {}),
  tipoDte: d.tipoDte as FilaCompra["tipoDte"],
  folio: d.folio,
  fechaEmision: d.fechaEmision,
  montoNeto: d.montoNeto,
  montoExento: d.montoExento,
  montoIva: d.montoIva,
  montoOtros: Math.max(0, d.montoTotal - d.montoNeto - d.montoExento - d.montoIva),
  montoTotal: d.montoTotal,
});

type Sincronizacion = ResultadoImportacion & { anio: number; mes: number; recibidos: number; omitidos: number };

export async function sincronizarRcv(ctx: Contexto, anio: number, mes: number, dryRun: boolean): Promise<Sincronizacion> {
  const creds = await credencialesSimpleApi(ctx);
  if (!creds) throw reglaDeNegocio("Falta configurar Emisión DTE (API key de SimpleAPI y certificado) para leer el RCV.");
  let consulta: Awaited<ReturnType<typeof consultarRcvCompras>>;
  try {
    consulta = await consultarRcvCompras(creds, mes, anio);
  } catch (e) {
    if (e instanceof ErrorProveedorSii) throw reglaDeNegocio(`SimpleAPI no entregó el RCV de ${mes}/${anio}: ${e.motivo}.`);
    throw e;
  } finally {
    // SimpleAPI cobra la consulta aunque falle: se mide siempre.
    await ctx.medidor
      .registrar({ ...consumoBase(ctx, "finanzas"), recurso: "sii.rcv", unidad: "consulta", cantidad: 1, yaIncurrido: true })
      .catch(() => undefined);
  }
  // Solo los tipos que acepta el libro de compras (33, 34, 56, 61); los demás se cuentan como omitidos.
  const documentos = consulta.documentos.filter((d) => TIPOS.has(d.tipoDte)).map(aFila);
  const omitidos = consulta.descartados + consulta.documentos.length - documentos.length;
  const vacio = { nuevos: 0, duplicados: 0, errores: 0, proveedoresCreados: 0, filas: [] };
  const r = documentos.length
    ? await importarDocumentosCompra(ctx, { documentos, crearProveedores: true }, dryRun, "sii_rcv")
    : vacio;
  return { ...r, anio, mes, recibidos: consulta.documentos.length, omitidos };
}

const salida = z.object({
  anio: z.number().int(),
  mes: z.number().int(),
  recibidos: z.number().int().describe("Documentos que informó el SII para el mes."),
  nuevos: z.number().int(),
  duplicados: z.number().int(),
  errores: z.number().int(),
  omitidos: z.number().int().describe("Filas incompletas o de un tipo que el libro de compras no lleva."),
  proveedoresCreados: z.number().int(),
});

export const comprasSincronizarRcv = defineCapability({
  id: "finanzas.compras.sincronizar_rcv",
  descripcion:
    "Trae del SII (Registro de Compras y Ventas, vía SimpleAPI) las facturas y notas recibidas por la empresa en un mes y las agrega al libro de compras, creando los proveedores que falten. Repetirla no duplica nada. Con vista previa.",
  permiso: PERMISO_COMPRAS,
  input: z.object({
    anio: z.number().int().min(2017).max(2100).optional().describe("Por defecto, el año de hoy en Chile."),
    mes: z.number().int().min(1).max(12).optional().describe("Por defecto, el mes de hoy en Chile."),
  }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const hoy = mesChile();
    const r = await sincronizarRcv(ctx, input.anio ?? hoy.anio, input.mes ?? hoy.mes, dryRun);
    return salida.parse(r);
  },
});

export const trabajoSincronizarRcv = defineTrabajo({
  tipo: "finanzas.compras.sincronizar_rcv",
  descripcion:
    "Una vez al día trae del RCV del SII las compras del mes (las del mes anterior los tres primeros días) y las agrega al libro de compras sin duplicar. Solo actúa si la empresa tiene Emisión DTE con SimpleAPI configurada.",
  payload: z.object({}).passthrough(),
  periodicidad: "diaria",
  async handler(ctx) {
    if (!(await credencialesSimpleApi(ctx))) return { activo: false };
    const { anio, mes } = mesDelTrabajo();
    const r = await sincronizarRcv(ctx, anio, mes, false);
    return { activo: true, anio, mes, recibidos: r.recibidos, nuevos: r.nuevos, duplicados: r.duplicados, errores: r.errores };
  },
});
