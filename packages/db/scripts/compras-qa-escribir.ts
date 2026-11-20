import type { PrismaClient } from "../src/generated/prisma/client";
import { datosComprasQa } from "./compras-qa-datos";
import type { EtapaComprasQa } from "./compras-qa-preview-error";
import { fixtureComprasYaExiste } from "./compras-qa-verificar";

type EtapaFixture = Extract<EtapaComprasQa, `FIXTURE_${string}`>;
type Diagnosticar = <T>(etapa: EtapaFixture, accion: () => T | Promise<T>) => Promise<T>;
const sinDiagnostico: Diagnosticar = async (_etapa, accion) => accion();

/** Compartido por wrappers que verifican el destino antes de crear el cliente. */
export async function escribirComprasQa(
  db: PrismaClient,
  etapa: Diagnosticar = sinDiagnostico,
  politica: { permitirTrial: boolean } = { permitirTrial: false },
): Promise<void> {
  await etapa("FIXTURE_TX", () =>
    db.$transaction(
      async (tx) => {
        const tenant = await etapa("FIXTURE_TENANT_CONSULTA", () =>
          tx.tenant.findUnique({ where: { slug: "qa-e2e" }, select: { id: true, estado: true } }),
        );
        const tenantQa = await etapa("FIXTURE_TENANT_AUSENTE", () => {
          if (!tenant) throw new Error("Falta qa-e2e activo.");
          return tenant;
        });
        await etapa(tenantQa.estado === "suspendido" ? "FIXTURE_TENANT_SUSPENDIDO" : "FIXTURE_TENANT_ESTADO", () => {
          if (tenantQa.estado !== "activo" && !(politica.permitirTrial && tenantQa.estado === "trial")) {
            throw new Error("Falta qa-e2e activo.");
          }
        });
        const tenantId = tenantQa.id;
        if (await etapa("FIXTURE_INTEGRIDAD", () => fixtureComprasYaExiste(tx, tenantId))) return;
        const d = datosComprasQa(tenantId);
        await etapa("FIXTURE_INSERT_PROVEEDOR", () => tx.proveedor.create({ data: d.proveedor }));
        await etapa("FIXTURE_INSERT_CUENTA", () => tx.cuentaBancaria.create({ data: d.cuenta }));
        await etapa("FIXTURE_INSERT_DOCUMENTOS", () => tx.documentoRecibido.createMany({ data: d.documentos }));
        await etapa("FIXTURE_INSERT_MOVIMIENTO", () => tx.movimientoBancario.create({ data: d.movimiento }));
        await etapa("FIXTURE_INSERT_CONCILIACION", () => tx.conciliacionBanco.create({ data: d.conciliacion }));
      },
      { isolationLevel: "Serializable" },
    ),
  );
}
