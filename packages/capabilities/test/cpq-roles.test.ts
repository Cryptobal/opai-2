// Brief 10 · CPQ PR 10.1: permisos por rol (cpq.md §7) sobre las capacidades base.
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { N1, ctxCpq, registrarCpq } from "./cpq-ayuda";

beforeEach(registrarCpq);

describe("permisos por rol (§7)", () => {
  it("viewer lee pero no crea; supervisor no ve CPQ", async () => {
    const v = ctxCpq({ rol: "viewer" }).ctx;
    expect((await executeCapability(v, "cpq.cotizaciones.list", {})).ok).toBe(true);
    expect(await executeCapability(v, "cpq.cotizaciones.create", { negocioId: N1 })).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    const s = ctxCpq({ rol: "supervisor" }).ctx;
    expect(await executeCapability(s, "cpq.cotizaciones.list", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("gerente crea y ve costos (sin aprobar ni modelo, ver permisos.test.ts)", async () => {
    const { ctx } = ctxCpq({ rol: "gerente" });
    const r = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: N1,
      margenObjetivo: 120_000,
    });
    expect(r.ok).toBe(true);
    expect(
      r.ok &&
        (r.data as { versionDetalle: { margenObjetivo?: number } }).versionDetalle.margenObjetivo,
    ).toBe(120_000);
  });
});
