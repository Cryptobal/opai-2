import type { PrismaClient } from "../src/generated/prisma/client";
import { datosComprasQa } from "./compras-qa-datos";
import { fixtureComprasYaExiste } from "./compras-qa-verificar";

/** Compartido por wrappers que verifican el destino antes de crear el cliente. */
export async function escribirComprasQa(db: PrismaClient): Promise<void> {
  await db.$transaction(
    async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { slug: "qa-e2e" } });
      if (!tenant || tenant.estado !== "activo") throw new Error("Falta qa-e2e activo.");
      if (await fixtureComprasYaExiste(tx, tenant.id)) return;
      const d = datosComprasQa(tenant.id);
      await tx.proveedor.create({ data: d.proveedor });
      await tx.cuentaBancaria.create({ data: d.cuenta });
      await tx.documentoRecibido.createMany({ data: d.documentos });
      await tx.movimientoBancario.create({ data: d.movimiento });
      await tx.conciliacionBanco.create({ data: d.conciliacion });
    },
    { isolationLevel: "Serializable" },
  );
}
