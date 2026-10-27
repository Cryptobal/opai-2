import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { requierePlataforma } from "../comun";
import { tenantSchema } from "../esquemas";
import { metricasDelMes, porLotes } from "./metricas";

const ACTIVOS = ["activo", "trial"];

export const platformTenantsList = defineCapability({
  id: "platform.tenants.list",
  descripcion:
    "Plataforma: todas las empresas con vertical, estado, módulos activos y en prueba, usuarios, gasto de IA del mes y última actividad.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({}),
  output: z.array(
    tenantSchema.extend({
      modulosActivos: z.number().describe("Módulos activos o en prueba (sin contar el núcleo)."),
      modulosTrial: z.number(),
      usuarios: z.number(),
      iaMesUsd: z.number(),
      ultimoAcceso: z.string().nullable().describe("Última ejecución de una capacidad."),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const p = requierePlataforma(ctx);
    const tenants = await p.globales.listarTenants();
    // Una consulta por tenant: nunca cross-tenant en una sola query.
    return porLotes(tenants, async (t) => {
      const db = p.paraTenant(t.id);
      const [modulos, usuarios, m] = await Promise.all([
        db.tenantModule.findMany({
          where: { estado: { in: ACTIVOS }, moduloId: { not: "core" } },
          select: { estado: true },
        }),
        db.membership.count({ where: { estado: "activa" } }),
        metricasDelMes(db),
      ]);
      return {
        ...t,
        modulosActivos: modulos.length,
        modulosTrial: modulos.filter((x) => x.estado === "trial").length,
        usuarios,
        iaMesUsd: m.iaUsd,
        ultimoAcceso: m.ultimoAcceso,
      };
    });
  },
});
