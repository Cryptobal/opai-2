// Solo fixtures ficticias en opai_e2e local (CAR-255): un cliente, dos borradores y una factura aceptada para el
// maestro-detalle de Ventas. Idempotente: cada corrida deja los borradores como nuevos. No toca permisos ni migraciones.
import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";

import { exigirBaseE2E } from "../../db/scripts/exigir-base-e2e";

const CUENTA = "00000000-0000-7000-8000-000000002550";
const EMITIDA = "00000000-0000-7000-8000-000000002553";
// Un par de borradores por proyecto de Playwright (1 teléfono, 2 iPad, 3 escritorio): los proyectos corren en
// paralelo y uno descarta lo que otro estaría mirando.
const n = process.argv[2] ?? "1";
if (!/^[1-3]$/.test(n)) throw new Error("Uso: seed-ventas-e2e.ts <1|2|3>");
const DOCS = {
  borradorEditar: `00000000-0000-7000-8000-00000000256${n}`,
  borradorDescartar: `00000000-0000-7000-8000-00000000257${n}`,
  emitida: EMITIDA,
};

async function main() {
  exigirBaseE2E();
  const tenant = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  await enTransaccion(tenant.id, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(255001)`;
    await tx.cuenta.upsert({
      where: { id: CUENTA },
      // RUT ficticio y cliente activo: si no, el cliente no aparece para facturar (e2e de destinatarios, CAR-320).
      create: { id: CUENTA, tenantId: tenant.id, nombre: "Cliente ficticio Ventas E2E", rut: "76999001-1", estado: "cliente_activo" },
      update: { rut: "76999001-1", estado: "cliente_activo" },
    });
    const base = { tenantId: tenant.id, cuentaId: CUENTA, tipoDte: 33, montoNeto: 10000, montoIva: 1900, montoTotal: 11900 };
    const docs = [
      { id: DOCS.borradorEditar, estadoDte: "borrador", folio: null, fechaEmision: null, glosa: "Servicio ficticio para editar" },
      { id: DOCS.borradorDescartar, estadoDte: "borrador", folio: null, fechaEmision: null, glosa: "Servicio ficticio para descartar" },
      { id: DOCS.emitida, estadoDte: "aceptado", folio: 9255, fechaEmision: new Date("2026-11-02"), glosa: "Servicio ficticio emitido" },
    ];
    for (const d of docs) {
      const existe = await tx.documentoEmitido.findUnique({ where: { id: d.id }, select: { id: true } });
      if (existe) {
        await tx.documentoEmitido.update({ where: { id: d.id }, data: { glosa: d.glosa } });
        continue;
      }
      await tx.documentoEmitido.create({
        data: { ...base, ...d, lineas: { create: [{ tenantId: tenant.id, orden: 0, glosa: d.glosa, monto: 10000 }] } },
      });
    }
  });
}
main()
  .catch(() => {
    console.error("No se pudo preparar la fixture de Ventas local");
    process.exitCode = 1;
  })
  .finally(() => void cerrarClientes());
