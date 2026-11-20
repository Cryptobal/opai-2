import type { Contexto } from "@opai/capabilities";

import { nombreCompleto } from "../formato";

export async function cabeceraReporte(
  ctx: Contexto,
  p: { desde: string; hasta: string; personaId?: string; instalacionId?: string },
) {
  const [tenant, perfil, persona, inst] = await Promise.all([
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    ctx.db.perfilEmpresa.findFirst({ where: { tenantId: ctx.tenantId }, select: { razonSocial: true, rut: true } }),
    p.personaId
      ? ctx.db.persona.findFirst({
          where: { id: p.personaId, tenantId: ctx.tenantId },
          select: { nombres: true, apellidos: true, rut: true },
        })
      : null,
    p.instalacionId
      ? ctx.db.instalacion.findFirst({
          where: { id: p.instalacionId, tenantId: ctx.tenantId },
          select: { nombre: true },
        })
      : null,
  ]);
  const lugar =
    inst?.nombre ??
    (p.instalacionId ? "Instalación" : p.personaId ? "Según instalación del día" : "Toda la empresa");
  return {
    razonSocial: perfil?.razonSocial ?? tenant?.nombre ?? "",
    rutEmpleador: perfil?.rut ?? "",
    trabajador: persona ? nombreCompleto(persona) : null,
    rutTrabajador: persona?.rut ?? null,
    lugar,
    periodo: `${p.desde} – ${p.hasta}`,
  };
}