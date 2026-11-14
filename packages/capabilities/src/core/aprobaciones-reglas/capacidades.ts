import { z } from "zod";

import { ACCIONES_APROBABLES, ETIQUETA_ACCION_APROBABLE, PERMISOS_CORE, ROLES } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "../maestros/comun";
import { reglaDeFila } from "./comun";

const reglaSchema = z.object({
  id: z.string(),
  accion: z.enum(ACCIONES_APROBABLES),
  accionEtiqueta: z.string(),
  montoMinimo: z
    .number()
    .int()
    .nullable()
    .describe("CLP. null: toda la acción, sin importar el monto."),
  aprobadorRol: z
    .string()
    .nullable()
    .describe("Rol base (owner, admin, gerente…) o id de un rol de la empresa."),
  aprobadorGrupoId: z.string().nullable(),
  activa: z.boolean(),
});
type Fila = Parameters<typeof reglaDeFila>[0];
const vista = (f: Fila): z.input<typeof reglaSchema> => {
  const r = reglaDeFila(f);
  const accion = r.accion as (typeof ACCIONES_APROBABLES)[number];
  return { ...r, accion, accionEtiqueta: ETIQUETA_ACCION_APROBABLE[accion] ?? r.accion };
};

/** El aprobador existe en la empresa: rol base, rol propio vigente o grupo vigente. */
async function exigeAprobador(ctx: Contexto, rol: string | null, grupoId: string | null) {
  if (!!rol === !!grupoId) throw reglaDeNegocio("Indica un rol o un grupo que apruebe, no ambos.");
  if (grupoId) {
    const g = await ctx.db.grupoUsuarios.findFirst({ where: { id: grupoId, archivadoEn: null } });
    if (!g) throw noEncontrado("El grupo aprobador");
  } else if (rol && !(ROLES as readonly string[]).includes(rol)) {
    const r = z.uuid().safeParse(rol).success
      ? await ctx.db.rol.findFirst({ where: { id: rol, archivadoEn: null } })
      : null;
    if (!r) throw noEncontrado("El rol aprobador");
  }
}

export const reglasAprobacionList = defineCapability({
  // Lectura auditada (NÚCLEO-H): solo los ids de las reglas reveladas.
  auditarLectura: (s) => s.items.map((r) => r.id),
  id: "core.aprobaciones.reglas_list",
  descripcion:
    "Reglas de aprobación de la empresa: qué acción (emitir al SII, enviar cotizaciones) necesita aprobación, desde qué monto y quién la aprueba.",
  permiso: PERMISOS_CORE.aprobacionesManage,
  // CAR-353: contrato único de listas (cursor + limite; items + siguiente).
  input: z.object({
    incluirInactivas: z.boolean().default(false),
    cursor: z.uuid().optional(),
    limite: z.number().int().min(1).max(200).default(200),
  }),
  output: z.object({ items: z.array(reglaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const crudas = await ctx.db.reglaAprobacion.findMany({
      where: input.incluirInactivas ? {} : { activa: true },
      // `montoMinimo` admite nulo: con nulls last el orden es total y el cursor no salta filas.
      orderBy: [{ accion: "asc" }, { montoMinimo: { sort: "asc", nulls: "last" } }, { id: "asc" }],
      // Sin `skip: 1` (CAR-400): la fila del cursor viene si aún cumple el filtro y se descarta abajo.
      ...(input.cursor
        ? { cursor: { id: input.cursor }, take: input.limite + 2 }
        : { take: input.limite + 1 }),
    });
    const filas = input.cursor && crudas[0]?.id === input.cursor ? crudas.slice(1) : crudas;
    const pagina = filas.slice(0, input.limite);
    const siguiente = filas.length > input.limite ? (pagina.at(-1)?.id ?? null) : null;
    return { items: pagina.map(vista), siguiente };
  },
});

export const reglasAprobacionGuardar = defineCapability({
  id: "core.aprobaciones.reglas_guardar",
  descripcion:
    "Crea o cambia una regla de aprobación: la acción, el monto mínimo en pesos (opcional) y quién aprueba (un rol o un grupo). Dueños y administradores aprueban todo igual.",
  permiso: PERMISOS_CORE.aprobacionesManage,
  // Gobierna quién aprueba lo irreversible: la configura una persona, nunca un agente (ADR-032).
  soloPersonas: true,
  input: z.object({
    id: uuidSchema.optional().describe("Para cambiar una regla existente."),
    accion: z.enum(ACCIONES_APROBABLES),
    montoMinimo: z.number().int().min(0).max(1e13).nullable().default(null),
    aprobadorRol: z.string().trim().min(1).max(80).nullable().default(null),
    aprobadorGrupoId: uuidSchema.nullable().default(null),
  }),
  output: reglaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...input }, { dryRun }) {
    await exigeAprobador(ctx, input.aprobadorRol, input.aprobadorGrupoId);
    if (id && !(await ctx.db.reglaAprobacion.findFirst({ where: { id, activa: true } })))
      throw noEncontrado("La regla");
    const data = {
      ...input,
      montoMinimo: input.montoMinimo === null ? null : BigInt(input.montoMinimo),
    };
    // Dos reglas activas con la misma acción y el mismo monto serían ambiguas: manda una sola (CAR-253).
    const repetida = await ctx.db.reglaAprobacion.findFirst({
      where: {
        accion: data.accion,
        montoMinimo: data.montoMinimo,
        activa: true,
        ...(id ? { id: { not: id } } : {}),
      },
    });
    if (repetida)
      throw reglaDeNegocio(
        "Ya hay una regla activa para esa acción y ese monto. Cámbiala en vez de crear otra.",
      );
    if (dryRun) return vista({ id: id ?? "", activa: true, ...data });
    const r = await escribirConEvento(
      ctx,
      { tipo: "core.regla_aprobacion.guardada", entidadTipo: "regla_aprobacion" },
      (tx) =>
        id
          ? tx.reglaAprobacion.update({ where: { id }, data })
          : tx.reglaAprobacion.create({ data: { tenantId: ctx.tenantId, activa: true, ...data } }),
    );
    return vista(r);
  },
});

export const reglasAprobacionDesactivar = defineCapability({
  id: "core.aprobaciones.reglas_desactivar",
  descripcion:
    "Desactiva una regla de aprobación: desde ahora esa acción ya no la pide. Las solicitudes pendientes que pidió siguen igual.",
  permiso: PERMISOS_CORE.aprobacionesManage,
  // Igual que guardar: gobierna quién aprueba lo irreversible, solo personas (ADR-032).
  soloPersonas: true,
  input: z.object({ id: uuidSchema }),
  output: reglaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const f = await ctx.db.reglaAprobacion.findFirst({ where: { id: input.id, activa: true } });
    if (!f) throw noEncontrado("La regla");
    if (dryRun) return vista({ ...f, activa: false });
    const r = await escribirConEvento(
      ctx,
      { tipo: "core.regla_aprobacion.desactivada", entidadTipo: "regla_aprobacion" },
      (tx) => tx.reglaAprobacion.update({ where: { id: f.id }, data: { activa: false } }),
    );
    return vista(r);
  },
});

export const capacidadesReglasAprobacion = [
  reglasAprobacionList,
  reglasAprobacionGuardar,
  reglasAprobacionDesactivar,
];
