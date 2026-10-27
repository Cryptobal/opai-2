import { beforeEach, describe, expect, it } from "vitest";
import { defineCapability, limpiarRegistro, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { z } from "zod";

import { ejecutarLectura, esquemasDelAgente, herramientasDelAgente } from "./herramientas";

beforeEach(() => limpiarRegistro());

function registrar() {
  const c = defineCapability({
    id: "core.prueba.nueva",
    descripcion: "Lee una capacidad nueva registrada sin editar el catálogo del agente interno.",
    permiso: "core:prueba.read",
    input: z.object({}),
    output: z.string(),
    efecto: "lectura",
    dryRun: false,
    portales: ["erp", "supervisor"],
    handler: async (ctx) => JSON.stringify(ctx.alcance),
  });
  registrarCapacidades([c]);
  return c;
}

describe("herramientas del registro común", () => {
  it("una capacidad nueva aparece automáticamente y conserva el alcance del usuario", async () => {
    registrar();
    const { ctx } = contextoDePrueba({
      modulosActivos: ["agente"],
      alcance: { instalaciones: ["propia"] },
    });
    expect(herramientasDelAgente(ctx).map((h) => h.nombre)).toEqual(["core_prueba_nueva"]);
    expect(await ejecutarLectura(ctx, "core_prueba_nueva", {})).toMatchObject({
      externo: true,
      dato: { ok: true, data: '{"instalaciones":["propia"]}' },
    });
  });

  it("sin permiso, licencia o portal no publica la capacidad", () => {
    registrar();
    for (const opciones of [
      { permisos: ["agente:usar"] },
      { permisos: ["core:prueba.read"] },
      { modulosActivos: [] },
      { portal: "cliente", portalesMembresia: ["cliente"] },
      { portal: null },
    ]) {
      const { ctx } = contextoDePrueba({ modulosActivos: ["agente"], ...opciones });
      expect(herramientasDelAgente(ctx)).toEqual([]);
    }
  });

  it("conserva el esquema publicado por MCP también para las escrituras", () => {
    registrar();
    registrarCapacidades([
      defineCapability({
        id: "core.prueba.escribir",
        descripcion:
          "Escribe una prueba con el esquema publicado del registro común de herramientas.",
        permiso: "core:prueba.read",
        input: z.object({}),
        output: z.string(),
        efecto: "escritura",
        dryRun: true,
        handler: async () => "prevista",
      }),
    ]);
    const { ctx } = contextoDePrueba({ modulosActivos: ["agente"] });
    const h = herramientasDelAgente(ctx).find((h) => h.capacidad.efecto === "escritura")!;
    expect(esquemasDelAgente(ctx).find((e) => e.nombre === h.nombre)?.esquema).toEqual(
      z.toJSONSchema(h.input, { io: "input" }),
    );
  });

  it("una herramienta desconocida no ejecuta otra capacidad por nombre", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["agente"] });
    expect(await ejecutarLectura(ctx, "core_ausente", {})).toMatchObject({
      dato: { ok: false, error: { code: "FORBIDDEN" } },
    });
  });
});
