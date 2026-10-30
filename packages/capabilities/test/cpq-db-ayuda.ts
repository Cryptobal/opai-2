// Siembra de una empresa con un negocio abierto, su instalación y un cargo, para cpq-db.test.ts.
import { randomUUID } from "node:crypto";

import type { Entorno } from "../../db/test/entorno";

export async function empresa(e: Entorno, slug: string) {
  const tenantId = (
    await e.admin.tenant.create({
      data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" },
    })
  ).id;
  const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cuenta" } })).id;
  const instalacionId = (
    await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre: `Planta ${slug}` } })
  ).id;
  const embudoId = (
    await e.admin.embudo.create({ data: { tenantId, nombre: "Ventas", porDefecto: true } })
  ).id;
  const etapaId = (
    await e.admin.etapa.create({ data: { tenantId, embudoId, nombre: "Prospecto" } })
  ).id;
  const negocioId = (
    await e.admin.negocio.create({
      data: { tenantId, cuentaId, embudoId, etapaId, titulo: `Negocio ${slug}` },
    })
  ).id;
  await e.admin.negocioInstalacion.create({ data: { tenantId, negocioId, instalacionId } });
  const cargoId = (await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
  return { tenantId, negocioId, cargoId };
}
