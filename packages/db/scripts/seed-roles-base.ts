// Siembra (idempotente, solo dev) los roles plantilla del tenant `gard` que 1.0 tenía y los cinco
// roles base de 2.0 no cubren (ADR-022, Brief 07c §16.1, opción B): "Central de monitoreo" e
// "Inspector DT". Son roles personalizados normales (sistema=false): el owner/admin los puede
// ajustar. Los permisos listados son del catálogo del núcleo; los de los módulos (ops, rondas,
// asistencia DT) se agregan cuando esos módulos existan y declaren sus permisos.
// Uso: DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db seed:roles-base
import "dotenv/config";

import { cerrarClientes, dbAdmin } from "../src/index";

/** Plantillas 1.0 → 2.0 (§16.1). Permisos del catálogo core; patrones `*.read` para lo futuro. */
const PLANTILLAS = [
  {
    nombre: "Central de monitoreo",
    descripcion:
      "Operación en tiempo real: ve instalaciones, cuentas, personas y documentos; sin finanzas, nómina ni gestión de usuarios.",
    permisos: [
      "core:tenant.read",
      "core:cuentas.read",
      "core:instalaciones.read",
      "core:personas.read",
      "core:documentos.read",
    ],
  },
  {
    nombre: "Inspector DT",
    descripcion:
      "Revisión de cumplimiento DT: lectura de personas, documentos e instalaciones; sin escritura ni finanzas.",
    permisos: [
      "core:tenant.read",
      "core:instalaciones.read",
      "core:personas.read",
      "core:documentos.read",
    ],
  },
] as const;

async function main(): Promise<void> {
  const db = dbAdmin();
  const tenant = await db.tenant.findUnique({ where: { slug: "gard" } });
  if (!tenant) throw new Error("No existe el tenant dev `gard`: corre antes seed:dev-tenant.");
  for (const p of PLANTILLAS) {
    await db.rol.upsert({
      where: { tenantId_nombre: { tenantId: tenant.id, nombre: p.nombre } },
      update: { descripcion: p.descripcion, permisos: [...p.permisos] },
      create: {
        tenantId: tenant.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        permisos: [...p.permisos],
        sistema: false,
      },
    });
    console.log(`Rol plantilla listo: ${p.nombre}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
