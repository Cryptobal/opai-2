// Siembra (idempotente, solo dev/test) los roles plantilla del tenant `gard` que 1.0 tenía y los
// cinco roles base de 2.0 no cubren (ADR-022, Brief 07c §16.1, opción B): «Central de monitoreo»,
// «Inspector DT» y los acotados «RRHH», «Finanzas» y «Payroll» (§16.1 y equivalencia-roles.md). Son
// roles personalizados normales (sistema=false): el owner/admin los puede ajustar. Los permisos
// listados son del catálogo del núcleo; los de los módulos (ops, rondas, asistencia DT, nómina,
// finanzas) se agregan cuando esos módulos existan y declaren sus permisos.
// Idempotente: no pisa un rol que ya exista (respeta los ajustes del tenant); solo crea los que faltan.
// Uso: DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db seed:roles-base
import "dotenv/config";

import { cerrarClientes, dbAdmin } from "../src/index";

/** Plantillas 1.0 → 2.0 (§16.1). Permisos concretos del catálogo core; los de módulos se suman luego. */
const PLANTILLAS = [
  {
    nombre: "Central de monitoreo",
    descripcion:
      "Ve instalaciones, cuentas, personas y documentos para operar en tiempo real. No ve finanzas ni sueldos y no administra usuarios.",
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
      "Revisa el cumplimiento laboral: ve personas, documentos, instalaciones, las estructuras de sueldo y la auditoría. Solo mira, no edita.",
    // Decisión de Carlos (26-oct-2026, chat de Diseño y QA): el Inspector DT también ve sueldos y
    // auditoría. Mapea las dos casillas de la sábana: «Estructuras y sueldos: ver» = estructuras.read;
    // «Auditoría: ver» = audit.read. Ver docs/2.0/paridad/equivalencia-roles.md.
    permisos: [
      "core:tenant.read",
      "core:instalaciones.read",
      "core:personas.read",
      "core:documentos.read",
      "core:estructuras.read",
      "core:audit.read",
    ],
  },
  {
    nombre: "RRHH",
    descripcion:
      "Ve personas y documentos. Para que además gestione sueldos o nómina, el dueño o el administrador se lo habilita aparte.",
    permisos: ["core:tenant.read", "core:personas.read", "core:documentos.read"],
  },
  {
    nombre: "Finanzas",
    descripcion:
      "Ve cuentas y documentos para conciliar y facturar. Para emitir o anular facturas, el dueño o el administrador se lo habilita aparte.",
    permisos: ["core:tenant.read", "core:cuentas.read", "core:documentos.read"],
  },
  {
    nombre: "Payroll",
    descripcion:
      "Ve personas y estructuras de sueldo para calcular remuneraciones. El dueño o el administrador habilita el procesamiento de nómina.",
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
