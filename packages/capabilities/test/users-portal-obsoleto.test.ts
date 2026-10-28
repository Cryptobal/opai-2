import { beforeEach, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba } from "../src/testing";
import { M2, semillaTenant } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

it.each(["cliente", "supervisor", "erp", null])(
  "al cambiar rol limpia solo la preferencia obsoleta (%s)",
  async (portalInicio) => {
    const base = semillaTenant("viewer");
    const semilla = {
      ...base,
      membership: base.membership.map((m) =>
        m.id === M2 ? { ...m, portales: ["erp"], portalInicio } : m,
      ),
    };
    const { ctx, tabla } = contextoDePrueba({ rol: "owner", semilla });
    const cambio = { membershipId: M2, rol: "gerente" };
    expect(
      await executeCapability(ctx, "core.users.update", cambio, { dryRun: true }),
    ).toMatchObject({ ok: true });
    expect(tabla("membership").find((m) => m["id"] === M2)?.["portalInicio"]).toBe(portalInicio);
    expect(await executeCapability(ctx, "core.users.update", cambio)).toMatchObject({ ok: true });
    expect(tabla("membership").find((m) => m["id"] === M2)?.["portalInicio"]).toBe(
      portalInicio === "erp" ? "erp" : null,
    );
  },
);

it("quitar y volver a conceder un portal no revive la preferencia antigua", async () => {
  const base = semillaTenant("viewer");
  const semilla = {
    ...base,
    membership: base.membership.map((m) =>
      m.id === M2 ? { ...m, portales: ["erp", "supervisor"], portalInicio: "supervisor" } : m,
    ),
  };
  const { ctx, tabla } = contextoDePrueba({ rol: "owner", semilla });
  for (const portales of [["erp"], ["erp", "supervisor"]]) {
    expect(
      await executeCapability(ctx, "core.users.update", { membershipId: M2, portales }),
    ).toMatchObject({ ok: true });
    expect(tabla("membership").find((m) => m["id"] === M2)?.["portalInicio"]).toBeNull();
  }
});
