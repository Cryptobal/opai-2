// Siembra (idempotente, solo dev/test) los roles plantilla del tenant `gard` que 1.0 tenía y los
// cinco roles base de 2.0 no cubren (ADR-022, Brief 07c §16.1, opción B): «Central de monitoreo»,
// «Inspector DT» y los acotados «RRHH», «Finanzas» y «Payroll» (§16.1 y equivalencia-roles.md). Son
// roles personalizados normales (sistema=false): el owner/admin los puede ajustar. Los permisos
// listados son del catálogo del núcleo; los de los módulos (ops, rondas, asistencia DT, nómina,
// finanzas) se agregan cuando esos módulos existan y declaren sus permisos.
// Idempotente: crea los que faltan y actualiza al conjunto canónico los roles sembrados que el
// tenant no editó (I1 de QA PR #60), sin pisar los que el tenant sí ajustó. La decisión y los datos
// viven en `roles-base-plantillas.ts` (probados sin base).
// Uso: DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db seed:roles-base
import "dotenv/config";

import { cerrarClientes, dbAdmin } from "../src/index";
import { decidirAccionRol, PLANTILLAS } from "./roles-base-plantillas";

async function main(): Promise<void> {
  // No corre en producción: solo contra bases de desarrollo o de test (ADR-002; igual que seed:e2e).
  if (process.env["VERCEL_ENV"] === "production" || process.env["NODE_ENV"] === "production") {
    throw new Error("seed:roles-base solo corre en desarrollo o test, nunca en producción.");
  }
  const db = dbAdmin();
  const tenant = await db.tenant.findUnique({ where: { slug: "gard" } });
  if (!tenant) throw new Error("No existe el tenant dev `gard`: corre antes seed:dev-tenant.");
  for (const p of PLANTILLAS) {
    const existe = await db.rol.findUnique({
      where: { tenantId_nombre: { tenantId: tenant.id, nombre: p.nombre } },
    });
    const accion = decidirAccionRol(existe, p);
    if (accion === "crear") {
      await db.rol.create({
        data: {
          tenantId: tenant.id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          permisos: [...p.permisos],
          sistema: false,
        },
      });
      console.log(`Rol plantilla creado: ${p.nombre}`);
    } else if (accion === "actualizar" && existe) {
      // Rol sembrado por una versión anterior y no editado por el tenant: se lleva al canónico.
      await db.rol.update({
        where: { id: existe.id },
        data: { descripcion: p.descripcion, permisos: [...p.permisos] },
      });
      console.log(`Rol plantilla actualizado (sembrado, sin edición del tenant): ${p.nombre}`);
    } else if (accion === "ya-al-dia") {
      console.log(`Rol plantilla ya al día (sin cambios): ${p.nombre}`);
    } else {
      console.log(`Rol plantilla existe y lo editó el tenant (sin tocar): ${p.nombre}`);
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
