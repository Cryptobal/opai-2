// Datos de QA de Finanzas SOLO para desarrollo, en un tenant propio de QA (slug `qa-*`, nunca el real):
// proveedor, cuenta Santander con cartola de ejemplo, CAF de certificación ficticio y un cliente con datos
// tributarios. Todo ficticio (RUT 76111222-8, CAF sintético); idempotente. Guardas (seed-finanzas-qa-guardas.ts):
// OPAI_ENTORNO=dev, tenant `qa-*` explícito, ambas URLs a la misma base, simula por defecto y escribe con
// `--confirmar`; nunca pisa la configuración DTE existente.
// Uso: OPAI_ENTORNO=dev DATABASE_URL=<opai_app> DATABASE_URL_MIGRATE=<propietario de dev> OPAI_SECRETS_KEY=<clave dev> \
//      pnpm --filter @opai/capabilities seed:finanzas-qa --tenant qa-finanzas [--confirmar]
import { randomUUID } from "node:crypto";

import { cerrarClientes, dbAdmin } from "@opai/db";
import { QA_AISLADO, digitoVerificador, exigirSoloEmpresasQa } from "@opai/domain";

import {
  capacidadesDelNucleo,
  capacidadesFinanzas,
  crearContexto,
  executeCapability,
  registrarCapacidades,
} from "../src";
import { leerDestino } from "./seed-finanzas-qa-guardas";
import { cafXmlSintetico } from "../test/finanzas-caf-fixture";

const RUT_PROVEEDOR = `76555444-${digitoVerificador("76555444")}`;
const RUT_EMISOR = "76111222-8";
const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function main(): Promise<void> {
  const { slug, confirmar } = leerDestino(process.argv.slice(2), process.env);
  const admin = dbAdmin();
  if (process.env["OPAI_ENTORNO"] === QA_AISLADO.entorno) {
    // Falla cerrado: si la base trae cualquier empresa que no sea de QA (p. ej. `gard`), no es el QA vacío.
    exigirSoloEmpresasQa((await admin.tenant.findMany({ select: { slug: true } })).map((t) => t.slug));
  }
  const existente = await admin.tenant.findUnique({ where: { slug } });
  const config = existente ? await admin.dteConfig.findUnique({ where: { tenantId: existente.id } }) : null;
  if (config?.ambiente === "produccion") throw new Error(`El tenant «${slug}» emite en producción: no es de QA.`);
  if (!confirmar) {
    console.log(`Simulación en «${slug}»: ${existente ? "tenant existente" : "se crearía el tenant de QA"}; ${config ? "dte_config existente (no se toca)" : "se crearía dte_config de certificación"}; cliente, proveedor, cuenta Santander con 3 movimientos y CAF ficticio. Repite con --confirmar para aplicar.`);
    return;
  }
  const tenant = existente ?? (await admin.tenant.create({ data: { slug, nombre: "QA Finanzas (ficticio)", vertical: "seguridad" } }));
  const tenantId = tenant.id;
  // Módulo mínimo para operar el circuito: sin él la navegación y las capacidades de Finanzas no responden.
  await admin.tenantModule.upsert({
    where: { tenantId_moduloId: { tenantId, moduloId: "finanzas" } },
    update: {},
    create: { tenantId, moduloId: "finanzas", estado: "activo" },
  });

  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesFinanzas]);
  const usuarioId = randomUUID();
  const ctx = crearContexto({
    tenantId,
    actor: { tipo: "user", id: usuarioId },
    usuario: { id: usuarioId, nombre: "Seed QA", email: "seed-qa@opai.test", platformRole: null },
    portal: "erp",
    portalesMembresia: ["erp"],
    rol: "owner",
    modulosActivos: ["finanzas"],
    medidor: { registrar: async () => undefined },
  });
  const ejecutar = async (id: string, input: Record<string, unknown>) => {
    const r = await executeCapability(ctx, id, input);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data;
  };

  // Cliente con datos tributarios completos (emisión de facturas de prueba).
  if (!(await admin.cuenta.count({ where: { tenantId, rut: "77234567-8" } }))) {
    await admin.cuenta.create({
      data: {
        tenantId, nombre: "Cliente QA Finanzas", razonSocial: "Cliente QA Finanzas SpA", rut: "77234567-8",
        giro: "Servicios de seguridad", calle: "Av. Apoquindo 3000", comuna: "Las Condes", ciudad: "Santiago",
        region: "Región Metropolitana", emailDte: "dte@clienteqa.test", estado: "cliente_activo",
      },
    });
  }

  // Proveedor ficticio.
  if (!(await admin.proveedor.count({ where: { tenantId, rut: RUT_PROVEEDOR } }))) {
    await ejecutar("finanzas.proveedores.crear", { rut: RUT_PROVEEDOR, razonSocial: "Proveedor QA Ltda." });
  }

  // Cuenta Santander con una cartola de ejemplo (3 movimientos).
  let cuenta = await admin.cuentaBancaria.findFirst({ where: { tenantId, banco: "Santander", numeroVisible: "QA-0001" } });
  if (!cuenta) {
    cuenta = await admin.cuentaBancaria.create({
      data: { tenantId, banco: "Santander", numeroVisible: "QA-0001", moneda: "CLP" },
    });
  }
  const movimientos = [
    { fecha: "2026-10-28", monto: 1_190_000n, glosa: "Transferencia Cliente QA Finanzas", saldo: 5_190_000n },
    { fecha: "2026-10-29", monto: -350_000n, glosa: "Pago Proveedor QA Ltda.", saldo: 4_840_000n },
    { fecha: "2026-10-30", monto: 2_380_000n, glosa: "Abono varias facturas", saldo: 7_220_000n },
  ];
  for (const [i, m] of movimientos.entries()) {
    await admin.movimientoBancario.upsert({
      where: { tenantId_cuentaId_claveDedupe: { tenantId, cuentaId: cuenta.id, claveDedupe: `qa-seed-${i}` } },
      update: {},
      create: {
        tenantId, cuentaId: cuenta.id, fecha: dia(m.fecha), monto: m.monto, glosa: m.glosa,
        saldoDespues: m.saldo, claveDedupe: `qa-seed-${i}`, estado: "pendiente", origen: "cartola",
      },
    });
  }

  // Emisión de certificación y CAF sintético (la capacidad rechaza CAF reales en el tenant QA).
  if (!config) await ejecutar("finanzas.dte_config.actualizar", { ambiente: "certificacion", rutEmisor: RUT_EMISOR });
  // CAF sintéticos por tipo: 33 factura, 34 exenta, 56 nota de débito y 61 nota de crédito (rangos distintos).
  for (const [tipoDte, folioDesde] of [[33, 9000], [34, 9300], [56, 9200], [61, 9100]] as const) {
    if (!(await admin.dteFolio.count({ where: { tenantId, tipoDte, folioDesde } }))) {
      await ejecutar("finanzas.folios.cargar_caf", { cafXml: cafXmlSintetico({ tipoDte, folioDesde, folioHasta: folioDesde + 50 }) });
    }
  }
  console.log("Datos de QA de Finanzas listos (módulo finanzas, proveedor, cuenta Santander con 3 movimientos, CAF ficticios 33/34/56/61, cliente).");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
