// Compras desde el RCV del SII (CAR-273, paridad con `finance-rcv-sync` de OPAI 1). Trae las facturas que el SII
// registra como recibidas por la empresa y las deja en el libro de compras sin duplicar. Solo lectura del SII: el
// candado de ambiente de CAR-191 rige la emisión y la cesión, no esta consulta (ADR-089).
import { z } from "zod";

import { defineCapability } from "../define";
import { defineTrabajo } from "../trabajos/registro";
import type { Contexto } from "../types";
import { credencialesSimpleApi } from "./adaptador-sii";
import { consultarMes, esConsultaRcv, type ConsultaRcv } from "./compras-rcv-consulta";
import { PERMISO_COMPRAS } from "./comun";
import { importarDocumentosCompra, type ResultadoImportacion } from "./compras-importar-nucleo";

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

type Sincronizacion = ResultadoImportacion & { anio: number; mes: number; recibidos: number; omitidos: number };

/** Escribe en el libro de compras lo consultado. Va dentro de la transacción; la consulta va antes (fuera). */
export async function importarMes(ctx: Contexto, c: ConsultaRcv, dryRun: boolean): Promise<Sincronizacion> {
  const vacio = { nuevos: 0, duplicados: 0, errores: 0, proveedoresCreados: 0, filas: [] };
  const r = c.documentos.length
    ? await importarDocumentosCompra(ctx, { documentos: c.documentos, crearProveedores: true }, dryRun, "sii_rcv")
    : vacio;
  return { ...r, anio: c.anio, mes: c.mes, recibidos: c.recibidos, omitidos: c.omitidos };
}

const periodo = (i: { anio?: number | undefined; mes?: number | undefined }): [number, number] => {
  const hoy = mesChile();
  return [i.anio ?? hoy.anio, i.mes ?? hoy.mes];
};

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
  // La consulta HTTP a SimpleAPI va fuera de la transacción auditada (no la alarga ni la hace caer).
  preparar: (ctx, input) => consultarMes(ctx, ...periodo(input)),
  async handler(ctx, input, { dryRun, preparado }) {
    const consulta = esConsultaRcv(preparado) ? preparado : await consultarMes(ctx, ...periodo(input));
    return salida.parse(await importarMes(ctx, consulta, dryRun));
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
    const consulta = await consultarMes(ctx, anio, mes);
    // Sin `executeCapability`: la escritura y su auditoría van juntas en una transacción (ADR-052).
    const r = await ctx.transaccion(async (tx) => {
      const enTx: Contexto = { ...ctx, db: tx, transaccion: (fn) => fn(tx) };
      const hecho = await importarMes(enTx, consulta, false);
      if (hecho.nuevos > 0 || hecho.proveedoresCreados > 0)
        await ctx.auditoria.registrar(tx, {
          tenantId: ctx.tenantId,
          capability: "finanzas.compras.sincronizar_rcv",
          actor: ctx.actor,
          entityType: "libro_compras",
          payload: { anio, mes, nuevos: hecho.nuevos, duplicados: hecho.duplicados, proveedoresCreados: hecho.proveedoresCreados },
        });
      return hecho;
    });
    return { activo: true, anio, mes, recibidos: r.recibidos, nuevos: r.nuevos, duplicados: r.duplicados, errores: r.errores };
  },
});
