import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { denegar } from "../src/autorizacion";
import { capacidadesDelNucleo } from "../src/core";
import { defineCapability } from "../src/define";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, obtenerCapacidad, registrarCapacidades } from "../src/registry";
import { contextoDePrueba } from "../src/testing";

const handler = vi.fn(async () => ({}));
const compartida = defineCapability({
  id: "core.prueba_portal",
  descripcion: "Prueba el acceso compartido entre ERP y el portal Supervisor.",
  permiso: null,
  portales: ["erp", "supervisor"],
  input: z.object({}),
  output: z.object({}),
  efecto: "lectura",
  dryRun: false,
  handler,
});
const sup = (portal: string | null) =>
  contextoDePrueba({
    rol: "supervisor",
    portal,
    portalesMembresia: ["supervisor"],
  });
beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([...capacidadesDelNucleo, compartida]);
  handler.mockClear();
});

describe("portal de sesión (review 5661270514)", () => {
  it("Supervisor sin ERP no usa core.buscar desde supervisor ni ERP", async () => {
    for (const portal of ["supervisor", "erp"]) {
      const r = await executeCapability(sup(portal).ctx, "core.buscar", { q: "Alfa" });
      expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
  });

  it.each([null, "", "inventado", "cliente", "erp"])(
    "rechaza portal %s sin tocar el handler",
    async (portal) => {
      const r = await executeCapability(sup(portal).ctx, compartida.id, {});
      expect(r).toEqual({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "No tienes acceso a este portal.",
        },
      });
      expect(handler).not.toHaveBeenCalled();
    },
  );

  it("sin membresía no basta el portal, ni siquiera para una interna", async () => {
    const { ctx } = contextoDePrueba({ portalesMembresia: [] });
    expect(denegar(ctx, obtenerCapacidad("core.invitations.peek")!)).toMatchObject({
      error: { code: "FORBIDDEN", message: "No tienes acceso a este portal." },
    });
  });

  it("Supervisor puede ejecutar una capacidad compartida desde supervisor", async () => {
    expect(await executeCapability(sup("supervisor").ctx, compartida.id, {})).toMatchObject({
      ok: true,
    });
    expect(handler).toHaveBeenCalledOnce();
    const mapa = obtenerCapacidad("core.geo.mapa")!;
    expect(denegar(sup("supervisor").ctx, mapa)).toBeNull();
  });

  it.each(["owner", "admin", "supervisor"] as const)("%s con ERP puede buscar", async (rol) => {
    const { ctx } = contextoDePrueba({ rol, portal: "erp", portalesMembresia: ["erp"] });
    expect(await executeCapability(ctx, "core.buscar", { q: "Alfa" })).toMatchObject({ ok: true });
  });

  it("plataforma conserva su regla por platformRole, sin exigir membresía", () => {
    const { ctx } = contextoDePrueba({ portalesMembresia: [], portal: "platform" });
    ctx.usuario = { ...ctx.usuario!, platformRole: "owner" };
    // El autorizador real se prueba con el usuario plataforma desde la construcción del fixture.
    const plataforma = contextoDePrueba({
      usuario: ctx.usuario,
      portal: "platform",
      portalesMembresia: [],
    });
    expect(denegar(plataforma.ctx, obtenerCapacidad("platform.tenants.list")!)).toBeNull();
    expect(denegar(ctx, obtenerCapacidad("core.buscar")!)).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });

  it("API keys usuario/cuenta/persona y sistema conservan su comportamiento", () => {
    const buscar = obtenerCapacidad("core.buscar")!;
    for (const tipo of ["usuario", "cuenta", "persona"] as const) {
      const { ctx } = contextoDePrueba({
        actor: { tipo: "agent", id: "key", viaUserId: "user" },
        principal: { tipo, id: "principal" },
        portal: null,
        portalesMembresia: [],
      });
      const r = denegar(ctx, buscar);
      if (tipo === "usuario") expect(r).toBeNull();
      else expect(r).toMatchObject({ error: { code: "FORBIDDEN" } });
      const portal = tipo === "cuenta" ? "cliente" : "trabajador";
      expect(denegar(ctx, { ...obtenerCapacidad(compartida.id)!, portales: [portal] })).toBeNull();
    }
    const { ctx } = contextoDePrueba({
      actor: { tipo: "system" },
      portal: null,
      portalesMembresia: [],
    });
    expect(denegar(ctx, buscar)).toBeNull();
  });
});
