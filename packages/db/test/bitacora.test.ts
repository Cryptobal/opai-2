// La bitácora es append-only (ADR-023): ni la aplicación ni el rol propietario pueden modificarla.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("bitácora append-only", () => {
  let e: Entorno;
  let tenantId = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const t = await e.admin.tenant.create({
      data: { slug: `bitacora-${randomUUID().slice(0, 8)}`, nombre: "B", vertical: "seguridad" },
    });
    tenantId = t.id;
    await e.forTenant(tenantId).bitacora.create({
      data: {
        tenantId,
        seq: 1,
        tipo: "documento.registrado",
        payloadCanon: "{}",
        hashPrevio: "0".repeat(64),
        hash: "a".repeat(64),
      },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("la aplicación inserta y lee, pero no actualiza ni borra", async () => {
    const db = e.forTenant(tenantId);
    expect(await db.bitacora.count()).toBe(1);
    await expect(db.bitacora.updateMany({ data: { tipo: "x" } })).rejects.toThrow();
    await expect(db.bitacora.deleteMany()).rejects.toThrow();
  });

  it("el rol propietario tampoco puede actualizar, borrar ni truncar", async () => {
    await expect(e.admin.bitacora.updateMany({ data: { tipo: "x" } })).rejects.toThrow(
      /append-only/,
    );
    await expect(e.admin.bitacora.deleteMany({ where: { tenantId } })).rejects.toThrow(
      /append-only/,
    );
    await expect(e.admin.$executeRawUnsafe('TRUNCATE "core"."bitacora"')).rejects.toThrow(
      /append-only/,
    );
  });

  it("la secuencia es única por tenant", async () => {
    await expect(
      e.forTenant(tenantId).bitacora.create({
        data: { tenantId, seq: 1, tipo: "x", payloadCanon: "{}", hashPrevio: "0", hash: "1" },
      }),
    ).rejects.toThrow();
  });
});
