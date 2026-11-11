import { PERMISOS_CORE } from "@opai/domain";
import { escribirExcel, LIMITES_IMPORTACION, plantillaCsv, plantillaDe } from "@opai/domain/importacion";
import { z } from "zod";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { aplicarPlan } from "./aplicar";
import { importadorId, inputEjecutar, outputCatalogo, outputEjecutar } from "./esquemas";
import { armarPlan, contar, exigirAcceso, reporteDe } from "./plan";
import { IMPORTADORES, importadorDe } from "./registro";
import type { Importador } from "./tipos";

/** Importar es administrar la empresa (owner y admin por defecto); además se exige el permiso de cada entidad. */
export const PERMISO_IMPORTAR = PERMISOS_CORE.tenantManage;

function disponible(ctx: Contexto, imp: Importador): boolean {
  try {
    exigirAcceso(ctx, imp);
    return true;
  } catch {
    return false;
  }
}

export const importarCatalogo = defineCapability({
  id: "core.importar.catalogo",
  descripcion:
    "Lista lo que se puede importar desde una planilla (cuentas, contactos, instalaciones y negocios) con los campos de cada uno, cuáles son obligatorios, los encabezados que reconoce solo y los límites por carga.",
  permiso: PERMISO_IMPORTAR,
  portales: ["erp"],
  input: z.object({}),
  output: outputCatalogo,
  efecto: "lectura",
  dryRun: false,
  sinDb: true,
  handler: async (ctx) => ({
    importadores: IMPORTADORES.map((i) => ({
      id: i.def.id, etiqueta: i.def.etiqueta, descripcion: i.def.descripcion, disponible: disponible(ctx, i),
      campos: i.def.campos.map((c) => ({
        clave: c.clave, etiqueta: c.etiqueta, tipo: c.tipo, requerido: c.requerido === true, ayuda: c.ayuda ?? null,
        ejemplo: c.ejemplo ?? "", opciones: Object.keys(c.opciones ?? {}), sinonimos: [...(c.sinonimos ?? [])],
      })),
    })),
    limites: { filasPorLlamada: LIMITES_IMPORTACION.filas, filasPorArchivo: LIMITES_IMPORTACION.filasArchivo, megabytes: LIMITES_IMPORTACION.bytes / 1_000_000 },
  }),
});

export const importarPlantilla = defineCapability({
  id: "core.importar.plantilla",
  descripcion:
    "Entrega la plantilla descargable de un importador, en CSV o Excel: una fila de encabezados con los nombres exactos de los campos y una fila de ejemplo para borrar.",
  permiso: PERMISO_IMPORTAR,
  portales: ["erp"],
  input: z.object({ importador: importadorId, formato: z.enum(["csv", "xlsx"]).default("xlsx") }),
  output: z.object({ nombre: z.string(), mime: z.string(), contenidoBase64: z.string() }),
  efecto: "lectura",
  dryRun: false,
  sinDb: true,
  async handler(_ctx, input) {
    const def = importadorDe(input.importador).def;
    if (input.formato === "csv")
      return { nombre: `plantilla-${def.id}.csv`, mime: "text/csv", contenidoBase64: Buffer.from(plantillaCsv(def), "utf8").toString("base64") };
    const p = plantillaDe(def);
    const bytes = await escribirExcel(def.etiqueta, p.columnas, [p.ejemplo]);
    return {
      nombre: `plantilla-${def.id}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      contenidoBase64: Buffer.from(bytes).toString("base64"),
    };
  },
});

export const importarEjecutar = defineCapability({
  id: "core.importar.ejecutar",
  descripcion:
    "Importa cuentas, contactos, instalaciones o negocios desde una planilla CSV o Excel, filas estructuradas o el export JSON de OPAI 1. La vista previa (simulación) muestra fila por fila qué se crearía, qué se completaría y qué errores hay, sin guardar nada. Reconoce lo que ya existe (RUT, correo, nombre o id de origen), así que repetir la carga no duplica. Cada carga queda como un lote que se puede revertir.",
  permiso: PERMISO_IMPORTAR,
  portales: ["erp"],
  input: inputEjecutar,
  output: outputEjecutar,
  // El contenido de la planilla (datos de clientes y contactos) no va a la auditoría: queda el resumen.
  sensibles: ["archivo", "filas", "opai1"],
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const imp = importadorDe(input.importador);
    const plan = await armarPlan(ctx, imp, input);
    const conteos = contar(plan.filas);
    const salida = {
      importador: imp.def.id, origen: plan.origen, columnas: plan.columnas, mapeo: plan.mapeo, columnasIgnoradas: plan.columnasIgnoradas,
      bloqueos: plan.bloqueos, totalFilas: plan.totalFilas, desde: input.desde, siguiente: plan.siguiente, filas: reporteDe(plan),
    };
    if (dryRun) return { ...salida, simulacion: true, conteos, importacionId: null };
    if (plan.bloqueos.length) throw reglaDeNegocio(plan.bloqueos.join(" "));
    if (input.soloSiTodoValido && conteos.error > 0)
      throw reglaDeNegocio(`Hay ${conteos.error} filas con errores y pediste importar solo si todo es válido. No se guardó nada.`);
    if (conteos.crear + conteos.actualizar === 0 && !input.importacionId) return { ...salida, simulacion: false, conteos, importacionId: null };
    const r = await aplicarPlan(ctx, imp, plan, input.importacionId);
    return { ...salida, simulacion: false, conteos: r.hechos, importacionId: r.importacionId };
  },
});
