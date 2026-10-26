import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "../maestros/comun";

/** Membresía de un supervisor del tenant (gobierno de acceso, no se acota por filas). */
async function supervisorDe(ctx: Contexto, membershipId: string) {
  const m = await ctx.db.membership.findUnique({ where: { id: membershipId } });
  if (!m) throw noEncontrado("El usuario");
  // El alcance por filas de este brief es solo del rol base supervisor (§16.4). Otros roles no se
  // acotan por instalación; cliente y trabajador se suman con sus portales (fase 3).
  if (m.rol !== "supervisor") throw reglaDeNegocio("El alcance por instalación es solo del supervisor.");
  return m;
}

/** Ids de instalaciones a cargo de una membresía. */
async function idsDe(ctx: Contexto, membershipId: string): Promise<string[]> {
  const filas = await ctx.db.supervisorInstalacion.findMany({
    where: { membershipId },
    select: { instalacionId: true },
  });
  return filas.map((f) => f.instalacionId);
}

/** Instalaciones (id y nombre) de un conjunto de ids, ordenadas por nombre. */
async function nombresDe(ctx: Contexto, ids: string[]) {
  if (!ids.length) return [];
  const filas = await ctx.db.instalacion.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return filas.map((f) => ({ id: f.id, nombre: f.nombre }));
}

const instalacionRef = z.object({ id: z.string(), nombre: z.string() });
const asignacionSchema = z.object({
  membershipId: z.string(),
  instalaciones: z.array(instalacionRef),
});
const entrada = z.object({
  membershipId: uuidSchema,
  instalacionIds: z.array(uuidSchema).min(1).max(500),
});

export const supervisoresList = defineCapability({
  id: "core.supervisores.list",
  descripcion:
    "Instalaciones a cargo de un supervisor (su alcance por filas). El supervisor solo ve las cuentas, instalaciones y personas de estas instalaciones.",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({ membershipId: uuidSchema }),
  output: asignacionSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await supervisorDe(ctx, input.membershipId);
    const ids = await idsDe(ctx, input.membershipId);
    return { membershipId: input.membershipId, instalaciones: await nombresDe(ctx, ids) };
  },
});

export const supervisoresAsignar = defineCapability({
  id: "core.supervisores.asignar",
  soloPersonas: true,
  descripcion:
    "Asigna instalaciones a un supervisor: pasan a formar su alcance por filas (ve solo sus cuentas, instalaciones y personas). Repetir no duplica. Solo owner o admin.",
  permiso: PERMISOS_CORE.usersManage,
  input: entrada,
  output: asignacionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const m = await supervisorDe(ctx, input.membershipId);
    const existen = await ctx.db.instalacion.count({ where: { id: { in: input.instalacionIds } } });
    if (existen !== new Set(input.instalacionIds).size) throw noEncontrado("Alguna instalación");
    const actuales = await idsDe(ctx, m.id);
    const resultado = [...new Set([...actuales, ...input.instalacionIds])];
    if (dryRun) return { membershipId: m.id, instalaciones: await nombresDe(ctx, resultado) };
    await escribirConEvento(
      ctx,
      {
        tipo: "core.supervisor.instalaciones_asignadas",
        entidadTipo: "membership",
        payload: () => ({ instalacionIds: input.instalacionIds }),
      },
      async (tx) => {
        await tx.supervisorInstalacion.createMany({
          data: input.instalacionIds.map((instalacionId) => ({
            tenantId: ctx.tenantId,
            membershipId: m.id,
            instalacionId,
          })),
          skipDuplicates: true,
        });
        return m;
      },
    );
    return { membershipId: m.id, instalaciones: await nombresDe(ctx, resultado) };
  },
});

export const supervisoresQuitar = defineCapability({
  id: "core.supervisores.quitar",
  soloPersonas: true,
  descripcion:
    "Quita instalaciones del alcance de un supervisor: deja de ver sus cuentas, instalaciones y personas al instante. Solo owner o admin.",
  permiso: PERMISOS_CORE.usersManage,
  input: entrada,
  output: asignacionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const m = await supervisorDe(ctx, input.membershipId);
    const quitar = new Set(input.instalacionIds);
    const resultado = (await idsDe(ctx, m.id)).filter((id) => !quitar.has(id));
    if (dryRun) return { membershipId: m.id, instalaciones: await nombresDe(ctx, resultado) };
    await escribirConEvento(
      ctx,
      {
        tipo: "core.supervisor.instalaciones_quitadas",
        entidadTipo: "membership",
        payload: () => ({ instalacionIds: input.instalacionIds }),
      },
      async (tx) => {
        await tx.supervisorInstalacion.deleteMany({
          where: { membershipId: m.id, instalacionId: { in: input.instalacionIds } },
        });
        return m;
      },
    );
    return { membershipId: m.id, instalaciones: await nombresDe(ctx, resultado) };
  },
});
