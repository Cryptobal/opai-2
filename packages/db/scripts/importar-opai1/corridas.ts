// Corridas de importación: cada `aplicar` queda registrada, se carga en lotes (cada lote en su
// transacción) y se puede reanudar: lo ya importado se detecta por id de 1.0 y no se duplica.
import { enTransaccion } from "../../src/index";
import {
  aplicarPlanEnTransaccion,
  mapasVacios,
  type MapasImportacion,
  type ResultadoAplicacion,
} from "./aplicar";
import type { Plan } from "./plan";
import { registroEnCorrida } from "./registro";

export const TAMANO_LOTE = 500;
export const VERSION_CONTRATO = "opai1-export/v1";

export type DatosCorrida = {
  modo: "simular" | "aplicar";
  origen: "api" | "instantanea" | "fixtures";
  versionContrato?: string;
  lanzadaPorId?: string | null;
};

export class ImportacionCerradaError extends Error {
  constructor() {
    super("La importación de esta empresa está cerrada: ya no se puede aplicar desde 1.0.");
  }
}

/** Tras el corte (`importacion_cerrada_en`), `aplicar` se rechaza salvo reimportación del operador. */
export async function exigirImportacionAbierta(
  tenantId: string,
  reimportar: boolean,
): Promise<void> {
  if (reimportar) return;
  const t = await enTransaccion(tenantId, (tx) =>
    tx.tenant.findFirst({ where: { id: tenantId }, select: { importacionCerradaEn: true } }),
  );
  if (t?.importacionCerradaEn) throw new ImportacionCerradaError();
}

export async function iniciarCorrida(tenantId: string, d: DatosCorrida): Promise<string> {
  const c = await enTransaccion(tenantId, (tx) =>
    tx.importacion.create({
      data: {
        tenantId,
        origen: d.origen,
        versionContrato: d.versionContrato ?? VERSION_CONTRATO,
        modo: d.modo,
        lanzadaPorId: d.lanzadaPorId ?? null,
      },
      select: { id: true },
    }),
  );
  return c.id;
}

export async function cerrarCorrida(
  tenantId: string,
  id: string,
  estado: "completada" | "fallida",
  conteos: Record<string, unknown>,
): Promise<void> {
  await enTransaccion(tenantId, (tx) =>
    tx.importacion.update({
      where: { id },
      data: { estado, conteos: conteos as object, terminadaEn: new Date() },
    }),
  );
}

type Lote = Pick<Plan, "cuentas" | "contactos" | "instalaciones" | "programaciones" | "negocios" | "cotizaciones">;
// Los negocios van al final: necesitan las cuentas creadas en lotes anteriores (mapa en memoria).
const CLAVES: (keyof Lote)[] = ["cuentas", "contactos", "instalaciones", "programaciones", "negocios", "cotizaciones"];

/** Parte el plan en lotes de a lo más `tam` filas por entidad, respetando el orden de dependencias. */
export function partirEnLotes(plan: Plan, tam: number = TAMANO_LOTE): Plan[] {
  const lotes: Plan[] = [];
  const vacio = { cuentas: [], contactos: [], instalaciones: [], programaciones: [], negocios: [], cotizaciones: [] };
  for (const clave of CLAVES) {
    const filas = plan[clave];
    for (let i = 0; i < filas.length; i += tam) {
      lotes.push({ ...plan, ...vacio, [clave]: filas.slice(i, i + tam) } as Plan);
    }
  }
  return lotes;
}

/** Aplica el plan lote a lote; cada lote es una transacción con su registro de filas. */
export async function aplicarPorLotes(
  tenantId: string,
  importacionId: string,
  plan: Plan,
  tam: number = TAMANO_LOTE,
  mapas: MapasImportacion = mapasVacios(),
  creadoPorId: string | null = null,
): Promise<ResultadoAplicacion> {
  const total: ResultadoAplicacion = {
    mapas,
    aplicadas: { cuentas: 0, contactos: 0, instalaciones: 0, programaciones: 0, negocios: 0, cotizaciones: 0 },
    omitidas: 0,
  };
  for (const lote of partirEnLotes(plan, tam)) {
    const r = await enTransaccion(
      tenantId,
      (tx) =>
        aplicarPlanEnTransaccion(tx, tenantId, lote, registroEnCorrida(tx, tenantId, importacionId), mapas, creadoPorId),
      { timeoutMs: 120_000 },
    );
    for (const k of Object.keys(total.aplicadas) as (keyof typeof total.aplicadas)[])
      total.aplicadas[k] += r.aplicadas[k];
    total.omitidas += r.omitidas;
  }
  return total;
}
