import { z } from "zod";

import {
  PERMISOS_CORE,
  entradasComplementoCatalogo,
  padreComplementoCatalogo,
  tienePrecioAparte,
} from "@opai/domain";
import { operacionesEmpresa, type OperacionesEmpresa } from "@opai/db";

import { defineCapability } from "../define";
import { listarModulos } from "../module";
import { areaDeModulo } from "./modulos-catalogo";
export { auditList } from "./auditoria-lista";

export const moduloEstadoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  /** Vacío en complementos de catálogo sin manifest. */
  version: z.string(),
  dependencias: z.array(z.string()),
  /** null = no contratado en este tenant. */
  estado: z.string().nullable(),
  complemento: z.boolean(),
  padreId: z.string().nullable(),
  area: z.string().nullable(),
  /** Leyenda comercial: «Pagado» o texto del catálogo cuando aplica. */
  etiquetaCobro: z.string().nullable(),
});

/** Manifests y complementos de catálogo con su estado en el tenant. */
export function modulosConEstado(filas: readonly { moduloId: string; estado: string }[]) {
  const estado = new Map(filas.map((f) => [f.moduloId, f.estado]));
  const porPadre = new Map<string, ReturnType<typeof filaComplemento>[]>();
  for (const e of entradasComplementoCatalogo()) {
    const padre = padreComplementoCatalogo(e.id);
    if (!padre) continue;
    const fila = filaComplemento(e, estado, padre);
    const lista = porPadre.get(padre) ?? [];
    lista.push(fila);
    porPadre.set(padre, lista);
  }
  const salida: z.infer<typeof moduloEstadoSchema>[] = [];
  for (const m of listarModulos()) {
    salida.push({
      id: m.id,
      nombre: m.nombre,
      version: m.version,
      dependencias: [...m.dependencias],
      estado: estado.get(m.id) ?? null,
      complemento: false,
      padreId: null,
      area: areaDeModulo(m.id),
      etiquetaCobro: null,
    });
    for (const c of porPadre.get(m.id) ?? []) salida.push(c);
  }
  return salida;
}

function filaComplemento(
  e: ReturnType<typeof entradasComplementoCatalogo>[number],
  estado: Map<string, string>,
  padre: string,
) {
  const deps = e.dependencias.flatMap((g) => g);
  return {
    id: e.id,
    nombre: e.nombre,
    version: "",
    dependencias: deps,
    estado: estado.get(e.id) ?? null,
    complemento: true,
    padreId: padre,
    area: areaDeModulo(padre),
    etiquetaCobro: tienePrecioAparte(e.id) ? "Pagado" : null,
  };
}

export const modulesList = defineCapability({
  id: "core.modules.list",
  descripcion:
    "Módulos disponibles en OPAI con su estado en la empresa actual (activo, trial, suspendido o no contratado).",
  permiso: PERMISOS_CORE.tenantRead,
  input: z.object({}),
  output: z.array(moduloEstadoSchema),
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx) => modulosConEstado(await ctx.db.tenantModule.findMany()),
});

export const usoSchema = z.object({
  desde: z.string(),
  total: z.number(),
  errores: z.number(),
  porModulo: z.array(z.object({ modulo: z.string(), total: z.number() })),
  porPortal: z.array(z.object({ portal: z.string(), total: z.number() })),
});

/** Ejecuciones de capacidades en los últimos `dias` (medidor de consumos, ADR-031). */
type FuenteUso = Pick<
  OperacionesEmpresa,
  "contarEjecuciones" | "ejecucionesPorModulo" | "ejecucionesPorPortal"
>;

/** Ejecuciones de los últimos días: de la empresa actual o, en Plataforma, de una empresa. */
export async function resumenUso(e: FuenteUso, dias: number) {
  const desde = new Date(Date.now() - dias * 86_400_000);
  const [total, errores, porModulo, porPortal] = await Promise.all([
    e.contarEjecuciones(desde),
    e.contarEjecuciones(desde, true),
    e.ejecucionesPorModulo(desde),
    e.ejecucionesPorPortal(desde),
  ]);
  return {
    desde: desde.toISOString(),
    total,
    errores,
    porModulo: porModulo.map((g) => ({ modulo: g.modulo, total: g._count._all })),
    porPortal: porPortal.map((g) => ({ portal: g.portal ?? "api", total: g._count._all })),
  };
}

export const usageSummary = defineCapability({
  id: "core.usage.summary",
  descripcion:
    "Uso de OPAI en la empresa: ejecuciones de capacidades por módulo y portal en los últimos días. (Reemplazada por core.consumos.resumen; se mantiene por compatibilidad.)",
  permiso: PERMISOS_CORE.tenantRead,
  input: z.object({ dias: z.number().int().min(1).max(365).default(30) }),
  output: usoSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => resumenUso(operacionesEmpresa(ctx.db, ctx.tenantId), input.dias),
});
