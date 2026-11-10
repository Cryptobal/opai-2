// CAR-251 · los grupos de usuarios llegan al MCP con su vista previa y solo owner/admin escribe.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { herramientasMcp } from "../src/mcp";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";

const ESCRITURAS = [
  "core.grupos.create",
  "core.grupos.update",
  "core.grupos.archive",
  "core.grupos.agregar_miembros",
  "core.grupos.quitar_miembro",
];
const agente = { tipo: "agent" as const, id: "k1", viaUserId: USUARIO_DE_PRUEBA.id };

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

describe("grupos de usuarios (CAR-251)", () => {
  it("toda escritura acepta dryRun, no es interna ni solo de personas", () => {
    for (const id of ESCRITURAS) {
      const c = capacidadesDelNucleo.find((x) => x.id === id);
      expect(c, id).toMatchObject({
        efecto: "escritura",
        dryRun: true,
        permiso: "core:users.manage",
      });
      expect(c?.interna, id).toBeFalsy();
      expect(c?.soloPersonas, id).toBeFalsy();
    }
  });

  it("una key de un admin ve las herramientas y su preview_", () => {
    const { ctx } = contextoDePrueba({ rol: "admin", actor: agente, scopes: ["*"] });
    const nombres = herramientasMcp(ctx).map((h) => h.nombre);
    for (const id of ESCRITURAS) {
      const n = id.replace(/\./g, "_");
      expect(nombres).toContain(n);
      expect(nombres).toContain(`preview_${n}`);
    }
    expect(nombres).toContain("core_grupos_list");
    expect(nombres).not.toContain("preview_core_grupos_list");
  });

  it("sin rol base owner/admin se rechaza antes de tocar la base", async () => {
    const { ctx } = contextoDePrueba({
      rol: "gerente",
      permisosRol: ["core:users.manage", "core:users.read"],
    });
    const r = await executeCapability(
      ctx,
      "core.grupos.create",
      { nombre: "Ventas" },
      { dryRun: true },
    );
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
