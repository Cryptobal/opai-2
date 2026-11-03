import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { semanaSchema } from "./esquemas";
import { filaImportSchema, filaDesdeRegistroCsv, MAX_FILAS_IMPORT, parsearCsv } from "./importar-parse";
import { PERMISO_CONFIGURAR } from "./permisos";
import { aFecha, ajustesDe, lunesHoy } from "./util";
import { escribirAjustes } from "./importar-ajustes";
import { aplicarFilasImportadas, type FilaValida } from "./importar-aplicar";

const resultadoFila = z.object({
  indice: z.number().int(),
  estado: z.enum(["ok", "error", "omitida"]),
  mensaje: z.string().nullable(),
  montoInterpretado: z.number().int().nullable().optional(),
});

/** Importa movimientos planificados desde CSV (separador , o ;). Vista previa obligatoria. */
export const flujoImportar = defineCapability({
  id: "finanzas.flujo.importar",
  descripcion:
    "Importa celdas planificadas del flujo desde CSV (columnas seccion, etiqueta, semana, monto, nota, vinculo). " +
    "Opcionalmente actualiza saldo inicial y semana de partida. XLSX queda pendiente de decisión.",
  permiso: PERMISO_CONFIGURAR,
  input: z.object({
    formato: z.enum(["csv"]).default("csv"),
    contenido: z.string().min(1).max(2_000_000),
    saldoInicial: z.number().int().optional(),
    desde: semanaSchema.optional(),
  }),
  output: z.object({
    aplicadas: z.number().int(),
    omitidas: z.number().int(),
    errores: z.number().int(),
    filas: z.array(resultadoFila),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.formato !== "csv") throw reglaDeNegocio("Solo se admite importación CSV en este release.");
    const registros = parsearCsv(input.contenido);
    if (registros.length > MAX_FILAS_IMPORT) throw reglaDeNegocio(`Máximo ${MAX_FILAS_IMPORT} filas por importación.`);
    const filasDb = await ctx.db.flujoFila.findMany({});
    // Se consideran todas las filas, pero escribir en una archivada es un error (hallazgo 9a).
    const porEtiqueta = new Map(filasDb.map((f) => [f.etiqueta.toLowerCase(), f]));
    const filas: z.infer<typeof resultadoFila>[] = [];
    let aplicadas = 0;
    let omitidas = 0;
    let errores = 0;
    const hoy = lunesHoy();

    // 1) Validación pura de todas las filas.
    const validas: { indice: number; row: FilaValida }[] = [];
    for (const [indice, reg] of registros.entries()) {
      const parsed = filaDesdeRegistroCsv(reg, indice);
      if (!parsed.ok) {
        errores += 1;
        filas.push({ indice, estado: "error", mensaje: parsed.motivo });
        continue;
      }
      const v = filaImportSchema.safeParse(parsed.fila);
      if (!v.success) {
        errores += 1;
        filas.push({ indice, estado: "error", mensaje: "Datos inválidos en la fila." });
        continue;
      }
      const existente = porEtiqueta.get(v.data.etiqueta.toLowerCase());
      if (existente && !existente.activa) {
        errores += 1;
        filas.push({ indice, estado: "error", mensaje: "La fila está archivada: reactívala antes de importar." });
        continue;
      }
      if (existente && existente.seccion !== v.data.seccion) {
        errores += 1;
        filas.push({
          indice,
          estado: "error",
          mensaje: `La fila «${existente.etiqueta}» ya existe como ${existente.seccion}: la sección del CSV no coincide.`,
        });
        continue;
      }
      if (v.data.semana < hoy) {
        omitidas += 1;
        filas.push({ indice, estado: "omitida", mensaje: "Semana pasada (cartola)." });
        continue;
      }
      const previa = validas.find(
        (x) => x.row.etiqueta.toLowerCase() === v.data.etiqueta.toLowerCase() && x.row.seccion !== v.data.seccion,
      );
      if (previa) {
        errores += 1;
        filas.push({ indice, estado: "error", mensaje: "La misma etiqueta aparece con otra sección en el CSV." });
        continue;
      }
      validas.push({ indice, row: v.data });
    }

    // 2) Una sola lectura de las celdas que las filas tocan.
    const filaIds = [...new Set(validas.flatMap((v) => porEtiqueta.get(v.row.etiqueta.toLowerCase())?.id ?? []))];
    const celdas = filaIds.length
      ? await ctx.db.flujoCelda.findMany({
          where: { filaId: { in: filaIds }, semana: { in: [...new Set(validas.map((v) => aFecha(v.row.semana)))] } },
        })
      : [];
    const celdaDe = new Map(celdas.map((c) => [`${c.filaId}|${c.semana.toISOString().slice(0, 10)}`, c]));
    const aEscribir: FilaValida[] = [];
    for (const { indice, row } of validas) {
      const fila = porEtiqueta.get(row.etiqueta.toLowerCase());
      const celda = fila ? celdaDe.get(`${fila.id}|${row.semana}`) : undefined;
      if (celda && celda.capa !== "plan") {
        omitidas += 1;
        filas.push({ indice, estado: "omitida", mensaje: "Celda comprometida o real." });
        continue;
      }
      aplicadas += 1;
      aEscribir.push(row);
      filas.push({ indice, estado: "ok", mensaje: null, ...(dryRun ? { montoInterpretado: row.monto } : {}) });
    }

    // 3) Todo o nada: con errores no se aplica nada; si la escritura falla, el error se propaga.
    if (!dryRun && errores > 0) {
      for (const f of filas)
        if (f.estado === "ok") {
          Object.assign(f, { estado: "omitida", mensaje: "No se aplicó: corrija los errores y vuelva a importar." });
          omitidas += 1;
        }
      aplicadas = 0;
    } else if (!dryRun && (aEscribir.length > 0 || input.saldoInicial != null || input.desde)) {
      const base = await ajustesDe(ctx);
      const ajustes = escribirAjustes(ctx, base, hoy, input);
      if (aEscribir.length > 0) await aplicarFilasImportadas(ctx, aEscribir, filasDb, celdas, ajustes);
      else await ctx.transaccion(ajustes);
    }
    filas.sort((a, b) => a.indice - b.indice);
    if (!dryRun && aplicadas > 0) {
      await ctx.transaccion(async (tx) => {
        await ctx.eventos.emitir(tx, {
          tipo: "finanzas.flujo.importado",
          entidadTipo: "flujoAjustes",
          entidadId: ctx.tenantId,
          payload: { aplicadas, omitidas, errores },
        });
      });
    }

    return { aplicadas, omitidas, errores, filas };
  },
});
