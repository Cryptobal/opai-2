import { PERMISOS_CORE } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "../maestros/comun";
import {
  asignacionSchema,
  entrada,
  exigirGobiernoDeAlcance,
  idsDe,
  nombresDe,
  supervisorDe,
} from "./supervisores-comun";

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
  descripcion:
    "Asigna instalaciones a un supervisor: pasan a formar su alcance por filas (ve solo sus cuentas, instalaciones y personas). Repetir no duplica. Solo owner o admin; un agente queda en aprobación humana.",
  permiso: PERMISOS_CORE.usersManage,
  input: entrada,
  output: asignacionSchema,
  // Gobierna el acceso de otra persona: para un agente es irreversible (aprobación humana salvo
  // autonomía «directo»), como `platform.users.set_role` (ADR-055). Una persona lo hace directo.
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const m = await supervisorDe(ctx, input.membershipId);
    exigirGobiernoDeAlcance(ctx, m, input.instalacionIds);
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
  descripcion:
    "Quita instalaciones del alcance de un supervisor: deja de ver sus cuentas, instalaciones y personas al instante. Solo owner o admin; un agente queda en aprobación humana.",
  permiso: PERMISOS_CORE.usersManage,
  input: entrada,
  output: asignacionSchema,
  // Gobierna el acceso de otra persona: para un agente es irreversible (aprobación humana salvo
  // autonomía «directo»), como `platform.users.set_role` (ADR-055). Una persona lo hace directo.
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const m = await supervisorDe(ctx, input.membershipId);
    exigirGobiernoDeAlcance(ctx, m, input.instalacionIds);
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
