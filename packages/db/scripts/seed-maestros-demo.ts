// Maestros ficticios del Design Prompt (cuentas, instalaciones, puestos, personas, vínculos) para el
// tenant `gard` de desarrollo. Nunca personas ni RUT reales. Idempotente: si ya hay datos, no hace nada.
// Uso: DATABASE_URL_MIGRATE=<url propietario de dev> pnpm --filter @opai/db seed:maestros-demo
import "dotenv/config";

import { digitoVerificador } from "@opai/domain";

import { cerrarClientes, dbAdmin } from "../src/index";
import { CUENTAS, INSTALACIONES, PERSONAS } from "./datos-demo";

const rut = (cuerpo: string) => `${cuerpo}-${digitoVerificador(cuerpo)}`;
const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function main(): Promise<void> {
  if (process.env["VERCEL_ENV"] === "production") throw new Error("Solo para desarrollo.");
  const db = dbAdmin();
  const tenant = await db.tenant.findUnique({ where: { slug: "gard" } });
  if (!tenant) throw new Error("Primero corre seed:dev-tenant.");
  const tenantId = tenant.id;
  if (await db.cuenta.count({ where: { tenantId, nombre: CUENTAS[0].nombre } })) {
    console.log("Los maestros de demostración ya existen.");
    return;
  }
  const cargos = new Map(
    (await db.cargo.findMany({ where: { tenantId } })).map((c) => [c.nombre, c.id]),
  );
  const cargo = (nombre: string) => {
    const id = cargos.get(nombre);
    if (!id) throw new Error(`Falta el cargo "${nombre}" (corre seed:dev-tenant).`);
    return id;
  };
  const cuentas = [];
  for (const c of CUENTAS) {
    cuentas.push(
      await db.cuenta.create({
        data: {
          tenantId,
          nombre: c.nombre,
          razonSocial: c.nombre,
          rut: rut(c.rut),
          giro: c.giro,
          estado: c.estado,
          clienteDesde: c.estado === "prospecto" ? null : dia("2024-03-01"),
          clienteHasta: c.estado === "cliente_inactivo" ? dia("2026-06-30") : null,
          region: "Región Metropolitana",
        },
      }),
    );
  }
  const instalaciones = [];
  for (const i of INSTALACIONES) {
    const { cuenta, ...datos } = i;
    instalaciones.push(
      await db.instalacion.create({
        data: {
          tenantId,
          cuentaId: cuentas[cuenta]?.id ?? "",
          ...datos,
          vigenteDesde: dia("2024-03-01"),
        },
      }),
    );
  }
  const quilicura = instalaciones[0]?.id ?? "";
  await db.puesto.createMany({
    data: [
      {
        tenantId,
        instalacionId: quilicura,
        cargoId: cargo("Guardia"),
        nombre: "Guardia día",
        diasTrabajo: 4,
        diasDescanso: 4,
        horaInicio: "08:00",
        horaFin: "20:00",
        jornada: "dia",
        dotacion: 2,
      },
      {
        tenantId,
        instalacionId: quilicura,
        cargoId: cargo("Guardia"),
        nombre: "Guardia noche",
        diasTrabajo: 4,
        diasDescanso: 4,
        horaInicio: "20:00",
        horaFin: "08:00",
        jornada: "noche",
        dotacion: 2,
      },
      {
        tenantId,
        instalacionId: instalaciones[1]?.id ?? "",
        cargoId: cargo("Supervisor"),
        nombre: "Supervisor de turno",
        diasTrabajo: 5,
        diasDescanso: 2,
        horaInicio: "09:00",
        horaFin: "18:00",
        jornada: "dia",
        dotacion: 1,
      },
    ],
  });
  for (const p of PERSONAS) {
    const bloqueada = "bloqueada" in p && p.bloqueada;
    const termino = "termino" in p ? dia(p.termino) : null;
    const persona = await db.persona.create({
      data: {
        tenantId,
        nombres: p.nombres,
        apellidos: p.apellidos,
        rut: rut(p.cuerpo),
        estado: termino ? "inactiva" : "activa",
        bloqueada,
        bloqueoMotivo: bloqueada ? "Ficticio: documentación OS-10 vencida" : null,
      },
    });
    await db.vinculoLaboral.create({
      data: {
        tenantId,
        personaId: persona.id,
        cargoId: cargo(p.cargo),
        tipo: p.tipo,
        inicio: dia(p.inicio),
        termino,
        estado: termino ? "terminado" : "vigente",
        motivoTermino: termino ? "Renuncia voluntaria (ficticio)" : null,
      },
    });
  }
  console.log(`Maestros de demostración listos en ${tenant.slug}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
