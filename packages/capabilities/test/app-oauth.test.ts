import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  comoAppOAuth,
  executeCapability,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

// CAR-247: una app que entra por OAuth (Claude, por ejemplo) actúa como agente vía la persona, con
// sus permisos y alcance, sin key ni plataforma; con solo `mcp:leer` no escribe nada.
beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
});

describe("comoAppOAuth", () => {
  it("es un agente vía la persona, sin key, sin plataforma y con su alcance", () => {
    const e = contextoDePrueba({ alcance: { instalaciones: [] } });
    const ctx = comoAppOAuth(e.ctx, { clientId: "c1", soloLectura: false });
    expect(ctx.actor).toEqual({
      tipo: "agent",
      id: "oauth:c1",
      viaUserId: e.ctx.usuario!.id,
      interno: true,
    });
    expect(ctx.agente).toBeNull();
    expect(ctx.plataforma).toBeNull();
    expect(ctx.alcance).toEqual({ instalaciones: [] });
    expect(ctx.autorizar("platform:tenants.manage")).toBe(false);
  });

  it("con solo lectura deja todos los módulos en lectura", async () => {
    // Como en producción: `core` es siempre activo y no viene en la lista de módulos de la empresa.
    const e = contextoDePrueba({ modulosActivos: [] });
    const ctx = comoAppOAuth(e.ctx, { clientId: "c1", soloLectura: true });
    expect(ctx.modulosSoloLectura).toEqual(expect.arrayContaining(["core", "platform"]));
    const r = await executeCapability(
      { ...ctx, medidor: e.ctx.medidor },
      "core.config.set",
      { modulo: "core", clave: "x", valor: "1" },
      { dryRun: true },
    );
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("no parte de otro agente ni de un contexto sin persona", () => {
    const agente = contextoDePrueba({
      actor: { tipo: "agent", id: "key-ficticia", viaUserId: "u" },
    }).ctx;
    expect(() => comoAppOAuth(agente, { clientId: "c1", soloLectura: false })).toThrow();
  });
});
