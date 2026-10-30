// Brief 10 · CPQ PR 10.1 (Revisor, bloqueo 2): las referencias a core.users de `cpq` (creada_por,
// solicitada_por, decidida_por) tienen FK y exigen que el usuario sea miembro de la empresa (trigger
// usuario_miembro, como firma_nucleo). Contra Postgres real (si hay DATABASE_URL_TEST).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import { empresa } from "./cpq-db-ayuda";

// Prisma traduce el 23503 del trigger y de la FK a su error de FK.
const NO_MIEMBRO = /Foreign key constraint violated|foreign key/i;

describe.skipIf(!urlPropietario)("CPQ: referencias a usuarios (FK y membresía)", () => {
  let e: Entorno;
  const t = { a: "", b: "" };
  let negA = "";
  let miembroA = "";
  let soloDeB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const a = await empresa(e, "cpq-us-a");
    const b = await empresa(e, "cpq-us-b");
    [t.a, t.b, negA] = [a.tenantId, b.tenantId, a.negocioId];
    const usuario = async (n: string) =>
      (
        await e.admin.user.create({
          data: { name: n, email: `${n}-${randomUUID().slice(0, 8)}@test.opai.cl` },
        })
      ).id;
    miembroA = await usuario("cpq-miembro-a");
    soloDeB = await usuario("cpq-solo-b");
    await e.admin.membership.createMany({
      data: [
        { tenantId: t.a, userId: miembroA, rol: "admin", portales: ["erp"] },
        { tenantId: t.b, userId: soloDeB, rol: "admin", portales: ["erp"] },
      ],
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const cotizacion = (creadaPor: string | null, numero: number) =>
    e.admin.cotizacion.create({
      data: {
        tenantId: t.a,
        negocioId: negA,
        codigo: `CPQ-2026-${900 + numero}`,
        anio: 2026,
        numero: 900 + numero,
        titulo: "T",
        creadaPor,
      },
    });

  it("un miembro de la empresa sí queda como creador (control)", async () => {
    await expect(cotizacion(miembroA, 1)).resolves.toMatchObject({ creadaPor: miembroA });
  });

  it("un usuario inexistente no se puede grabar como creador (FK)", async () => {
    await expect(cotizacion(randomUUID(), 2)).rejects.toThrow(NO_MIEMBRO);
  });

  it("un usuario de otra empresa no se puede grabar como creador (usuario_miembro)", async () => {
    await expect(cotizacion(soloDeB, 3)).rejects.toThrow(NO_MIEMBRO);
  });

  it("tampoco en las aprobaciones: solicitada_por y decidida_por de otra empresa fallan", async () => {
    const c = await cotizacion(null, 4);
    const v = await e.admin.versionCotizacion.create({
      data: {
        tenantId: t.a,
        cotizacionId: c.id,
        numero: 1,
        validaHasta: new Date("2026-12-31"),
        margenObjetivo: 100_000,
      },
    });
    const aprob = (por: Record<string, string>) =>
      e.admin.aprobacionCotizacion.create({
        data: { tenantId: t.a, versionId: v.id, motivo: "margen_bajo", ...por },
      });
    await expect(aprob({ solicitadaPor: soloDeB })).rejects.toThrow(NO_MIEMBRO);
    await expect(aprob({ decididaPor: soloDeB })).rejects.toThrow(NO_MIEMBRO);
    await expect(aprob({ solicitadaPor: miembroA })).resolves.toMatchObject({
      solicitadaPor: miembroA,
    });
  });
});
