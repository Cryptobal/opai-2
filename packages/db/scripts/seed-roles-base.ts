// Siembra (idempotente, solo dev/test) los roles plantilla del tenant `gard` que 1.0 tenía y los
// cinco roles base de 2.0 no cubren (ADR-022, Brief 07c §16.1, opción B): «Central de monitoreo»,
// «Inspector DT» y los acotados «RRHH», «Finanzas» y «Payroll» (mínimo privilegio: lectura y cálculo,
// nunca gerente; §16.1 y equivalencia-roles.md). Son roles personalizados normales (sistema=false):
// el owner/admin los puede ajustar. Los permisos listados son del catálogo del núcleo; los de los
// módulos (ops, rondas, asistencia DT, nómina, finanzas) se agregan cuando esos módulos existan y
// declaren sus permisos.
// Idempotente: no pisa un rol que ya exista (respeta los ajustes del tenant); solo crea los que faltan.
// Uso: DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db seed:roles-base
import "dotenv/config";

import { cerrarClientes, dbAdmin } from "../src/index";

/** Plantillas 1.0 → 2.0 (§16.1). Permisos concretos del catálogo core; los de módulos se suman luego. */
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
  {
    nombre: "RRHH",
    descripcion:
      "Personas y documentos de RRHH en lectura; la nómina la concede el owner/admin. Acotado, nunca gerente (mínimo privilegio).",
    permisos: ["core:tenant.read", "core:personas.read", "core:documentos.read"],
  },
  {
    nombre: "Finanzas",
    descripcion:
      "Lectura para conciliar y facturar (cuentas, documentos); finanzas la concede el owner/admin. Acotado, nunca gerente.",
    permisos: ["core:tenant.read", "core:cuentas.read", "core:documentos.read"],
  },
  {
    nombre: "Payroll",
    descripcion:
      "Lectura y cálculo de nómina (personas, estructuras de sueldo); nómina la concede el owner/admin. Acotado, nunca gerente.",
    permisos: ["core:tenant.read", "core:personas.read", "core:estructuras.read"],
  },
] as const;

async function main(): Promise<void> {
  // No corre en producción: solo contra bases de desarrollo o de test (ADR-002; igual que seed:e2e).
  if (process.env["VERCEL_ENV"] === "production" || process.env["NODE_ENV"] === "production") {
    throw new Error("seed:roles-base solo corre en desarrollo o test, nunca en producción.");
  }
  const db = dbAdmin();
  const tenant = await db.tenant.findUnique({ where: { slug: "gard" } });
  if (!tenant) throw new Error("No existe el tenant dev `gard`: corre antes seed:dev-tenant.");
  for (const p of PLANTILLAS) {
    // Idempotente y sin pisar: si el rol ya existe (quizá ajustado por el tenant), se deja como está.
    const existe = await db.rol.findUnique({
      where: { tenantId_nombre: { tenantId: tenant.id, nombre: p.nombre } },
    });
    if (existe) {
      console.log(`Rol plantilla ya existe (sin tocar): ${p.nombre}`);
      continue;
    }
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
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
