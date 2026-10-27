import { beforeEach, expect, it } from "vitest";
import {
  capacidadesDelNucleo,
  comoAgenteInterno,
  executeCapability,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
  registrarModulos,
} from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";

import { manifest } from "./manifest";

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([manifest]);
});
it("ni una API key ni el agente interno cambian su presupuesto mediante core.config.set", async () => {
  const e = contextoDePrueba({ modulosActivos: ["agente"] });
  const interno = { ...comoAgenteInterno(e.ctx), medidor: e.ctx.medidor };
  const externo = contextoDePrueba({
    modulosActivos: ["agente"],
    actor: { tipo: "agent", id: "key-ficticia", viaUserId: e.ctx.usuario!.id },
    scopes: ["*"],
  }).ctx;
  for (const ctx of [interno, externo])
    for (const dryRun of [true, false]) {
      expect(
        await executeCapability(
          ctx,
          "core.config.set",
          { modulo: "agente", clave: "presupuestoMensualMicro", valor: "0" },
          { dryRun },
        ),
      ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
  expect(
    await executeCapability(
      e.ctx,
      "core.config.set",
      { modulo: "agente", clave: "presupuestoMensualMicro", valor: "10" },
      { dryRun: true },
    ),
  ).toMatchObject({ ok: true });
});
it("delegar nunca concede plataforma ni admite otro agente como persona", () => {
  const e = contextoDePrueba({ modulosActivos: ["agente"], alcance: { instalaciones: [] } });
  const ctx = comoAgenteInterno(e.ctx);
  expect(ctx.alcance).toEqual({ instalaciones: [] });
  expect(ctx.autorizar("platform:tenants.manage")).toBe(false);
  expect(ctx.plataforma).toBeNull();
  expect(() => comoAgenteInterno(ctx)).toThrow();
  expect(contextoDePrueba({ rol: "gerente" }).ctx.autorizar("agente:configurar")).toBe(false);
});

it("un servicio no hereda el historial del agente interno de su responsable", async () => {
  const e = contextoDePrueba({
    modulosActivos: ["agente"],
    permisos: ["agente:usar"],
    principal: { tipo: "servicio", id: "servicio-ficticio" },
  });
  await e.ctx.transaccion((tx) =>
    e.ctx.auditoria.registrar(tx, {
      tenantId: e.ctx.tenantId,
      actor: {
        tipo: "agent",
        id: `agente-interno:${e.ctx.usuario!.id}`,
        viaUserId: e.ctx.usuario!.id,
      },
      capability: "core.prueba.accion",
    }),
  );
  expect(await executeCapability(e.ctx, "agente.historial.list", {})).toMatchObject({
    ok: true,
    data: [],
  });
  expect(
    await executeCapability({ ...e.ctx, principal: null }, "agente.historial.list", {}),
  ).toMatchObject({
    ok: true,
    data: [{ capacidad: "core.prueba.accion" }],
  });
});
