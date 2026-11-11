// Lectura de lo que llega al motor: un archivo CSV o Excel, filas ya estructuradas (agentes) o un export de OPAI 1.
import { ErrorPlanilla, LIMITES_IMPORTACION, leerCsv, leerExcel, tablaDeRegistros, type TablaCruda } from "@opai/domain/importacion";
import { z } from "zod";

import { reglaDeNegocio } from "../../errores";
import { filasDeOpai1 } from "./opai1";
import { SISTEMA_ARCHIVO } from "./tipos";

const celda = z.union([z.string().max(LIMITES_IMPORTACION.celda), z.number(), z.boolean(), z.null()]);

export const entradaSchema = {
  archivo: z
    .object({
      nombre: z.string().min(1).max(200).describe("Nombre del archivo con su extensión (.csv o .xlsx)."),
      contenidoBase64: z.string().min(1).max(2_800_000).describe("Contenido del archivo en base64 (máximo 2 MB)."),
    })
    .optional()
    .describe("Planilla CSV o Excel (hasta 20.000 filas). La primera fila es el encabezado."),
  filas: z
    .array(z.record(z.string().max(120), celda))
    .min(1)
    .max(LIMITES_IMPORTACION.filas)
    .optional()
    .describe("Alternativa al archivo: filas ya estructuradas (columna → valor), hasta 500 por llamada."),
  opai1: z
    .unknown()
    .optional()
    .describe("Alternativa al archivo: el export JSON de OPAI 1 (accounts, contacts, installations, deals, pipelineStages). Se toma la parte que corresponde al importador elegido."),
};

export type Entrada = { archivo?: { nombre: string; contenidoBase64: string } | undefined; filas?: Record<string, string | number | boolean | null>[] | undefined; opai1?: unknown };
export type EntradaLeida = { tabla: TablaCruda; origen: "csv" | "xlsx" | "filas" | "opai1_json"; sistema: string; archivo: string | null };

/** Convierte la entrada en una planilla. Exactamente una de las tres formas; los errores de lectura son de negocio. */
export async function leerEntrada(importador: string, e: Entrada): Promise<EntradaLeida> {
  const dadas = [e.archivo, e.filas, e.opai1].filter((x) => x !== undefined && x !== null).length;
  if (dadas !== 1) throw reglaDeNegocio("Entrega una sola fuente: `archivo`, `filas` u `opai1`.");
  try {
    if (e.filas) return { tabla: tablaDeRegistros(e.filas), origen: "filas", sistema: SISTEMA_ARCHIVO, archivo: null };
    if (e.opai1 !== undefined && e.opai1 !== null)
      return { tabla: tablaDeRegistros(filasDeOpai1(importador, e.opai1)), origen: "opai1_json", sistema: "opai1", archivo: null };
    const archivo = e.archivo;
    if (!archivo) throw new ErrorPlanilla("Falta el archivo.");
    const bytes = Buffer.from(archivo.contenidoBase64, "base64");
    if (bytes.byteLength > LIMITES_IMPORTACION.bytes) throw new ErrorPlanilla("El archivo supera el tamaño máximo (2 MB).");
    const extension = archivo.nombre.toLowerCase().split(".").pop();
    if (extension === "xlsx") return { tabla: await leerExcel(new Uint8Array(bytes)), origen: "xlsx", sistema: SISTEMA_ARCHIVO, archivo: archivo.nombre };
    if (extension === "csv" || extension === "txt")
      return { tabla: leerCsv(new TextDecoder("utf-8").decode(bytes)), origen: "csv", sistema: SISTEMA_ARCHIVO, archivo: archivo.nombre };
    throw new ErrorPlanilla("Formato no admitido. Usa .csv o .xlsx (un .xls antiguo se guarda primero como .xlsx).");
  } catch (error) {
    if (error instanceof ErrorPlanilla) throw reglaDeNegocio(error.message);
    throw error;
  }
}
