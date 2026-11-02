/* eslint-disable max-lines -- importación por filas con vista previa; el parseo vive en importar-parse.ts */
import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { lunesDe } from "../domain";
import { semanaSchema, sinDuplicado } from "./esquemas";
import { filaImportSchema, filaDesdeRegistroCsv, MAX_FILAS_IMPORT, parsearCsv } from "./importar-parse";
import { PERMISO_CONFIGURAR } from "./permisos";
import { aFecha, ajustesDe, bloquearSemanaFlujo, semanaSelladaEnTx } from "./util";
import { sincronizarAvisosEnTx } from "./aviso";

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
    if (input.formato !== "csv") throw reglaDeNegocio("Solo CSV en este PR; XLSX: TODO(decisión Carlos).");
    const registros = parsearCsv(input.contenido);
    if (registros.length > MAX_FILAS_IMPORT) throw reglaDeNegocio(`Máximo ${MAX_FILAS_IMPORT} filas por importación.`);
    const filasDb = await ctx.db.flujoFila.findMany({});
    const porEtiqueta = new Map(filasDb.map((f) => [f.etiqueta.toLowerCase(), f]));
    const filas: z.infer<typeof resultadoFila>[] = [];
    let aplicadas = 0;
    let omitidas = 0;
    let errores = 0;
    const hoy = new Date().toISOString().slice(0, 10);

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
      const row = v.data;
      if (await ctx.db.flujoCierre.findFirst({ where: { semana: aFecha(row.semana), sellada: true } })) {
        omitidas += 1;
        filas.push({ indice, estado: "omitida", mensaje: "Semana sellada." });
        continue;
      }
      const fila = porEtiqueta.get(row.etiqueta.toLowerCase());
      const celda = fila
        ? await ctx.db.flujoCelda.findFirst({ where: { filaId: fila.id, semana: aFecha(row.semana) } })
        : null;
      if (celda && celda.capa !== "plan") {
        omitidas += 1;
        filas.push({ indice, estado: "omitida", mensaje: "Celda comprometida o real." });
        continue;
      }
      if (dryRun) {
        aplicadas += 1;
        filas.push({ indice, estado: "ok", mensaje: null, montoInterpretado: row.monto });
        continue;
      }
      try {
        await ctx.transaccion(async (tx) => {
          await bloquearSemanaFlujo(tx, ctx, row.semana);
          if (await semanaSelladaEnTx(tx, row.semana)) throw reglaDeNegocio("Semana sellada.");
          let f = porEtiqueta.get(row.etiqueta.toLowerCase());
          if (!f) {
            f = await sinDuplicado(
              tx.flujoFila.create({
                data: {
                  tenantId: ctx.tenantId,
                  seccion: row.seccion,
                  etiqueta: row.etiqueta,
                  vinculo: row.vinculo ?? null,
                  arrastre: false,
                  orden: filasDb.length + indice,
                  activa: true,
                },
              }),
              `Ya existe una fila llamada "${row.etiqueta}".`,
            );
            porEtiqueta.set(row.etiqueta.toLowerCase(), f);
            await ctx.eventos.emitir(tx, {
              tipo: "finanzas.flujo.fila_creada",
              entidadTipo: "flujoFila",
              entidadId: f.id,
            });
          }
          const actual = await tx.flujoCelda.findFirst({
            where: { filaId: f.id, semana: aFecha(row.semana) },
          });
          if (actual && actual.capa !== "plan") throw reglaDeNegocio("Celda no editable.");
          const guardada = actual
            ? await tx.flujoCelda.update({
                where: { id: actual.id },
                data: { monto: row.monto, nota: row.nota ?? actual.nota },
              })
            : await tx.flujoCelda.create({
                data: {
                  tenantId: ctx.tenantId,
                  filaId: f.id,
                  semana: aFecha(row.semana),
                  capa: "plan",
                  monto: row.monto,
                  nota: row.nota ?? null,
                },
              });
          await ctx.eventos.emitir(tx, {
            tipo: "finanzas.flujo.celda_fijada",
            entidadTipo: "flujoCelda",
            entidadId: guardada.id,
          });
          await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
        });
        aplicadas += 1;
        filas.push({ indice, estado: "ok", mensaje: null });
      } catch {
        errores += 1;
        filas.push({ indice, estado: "error", mensaje: "No se pudo importar la fila." });
      }
    }

    if (!dryRun && (input.saldoInicial != null || input.desde)) {
      const base = await ajustesDe(ctx);
      await ctx.transaccion(async (tx) => {
        const data = {
          saldoInicial: input.saldoInicial ?? base.saldoInicial,
          umbral: base.umbral,
          desde: aFecha(input.desde ?? base.desde ?? lunesDe(hoy)),
          toleranciaCierre: base.toleranciaCierre,
          horizonteSemanas: base.horizonteSemanas,
          calendarioPagos: base.calendarioPagos,
          avisoActivo: base.avisoActivo,
          avisoUmbral: base.avisoUmbral,
          metaCeldaMs: base.metaCeldaMs,
          metaGuardadoP95Ms: base.metaGuardadoP95Ms,
          metaCargaInicialS: base.metaCargaInicialS,
          metasVisibles: base.metasVisibles,
        };
        const existe = await tx.flujoAjustes.findFirst({});
        if (existe) await tx.flujoAjustes.update({ where: { id: existe.id }, data });
        else await tx.flujoAjustes.create({ data: { ...data, tenantId: ctx.tenantId } });
        await ctx.eventos.emitir(tx, {
          tipo: "finanzas.flujo.ajustes_cambiados",
          entidadTipo: "flujoAjustes",
          entidadId: existe?.id ?? ctx.tenantId,
        });
      });
    }

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
