import { describe, expect, it } from "vitest";
import { defineCapability, executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { z } from "zod";

import { manifest } from "./manifest";

describe("módulo vendible del agente interno", () => {
  it("declara la licencia y permisos propios sin depender de módulos de negocio", () => {
    expect(manifest.id).toBe("agente");
    expect(manifest.dependencias).toEqual([]);
    expect(manifest.permisos.map((p) => p.id)).toEqual(["agente:usar", "agente:configurar"]);
    expect(manifest.navegacion).toEqual([]);
  });

  it("deniega usar el módulo sin licencia activa y sin el permiso propio", async () => {
    const capacidad = defineCapability({
      id: "agente.prueba.licencia",
      descripcion: "Comprueba el acceso al agente interno mediante el ejecutor común del núcleo.",
      permiso: "agente:usar",
      input: z.object({}),
      output: z.boolean(),
      efecto: "lectura",
      dryRun: false,
      handler: async () => true,
    });
    registrarCapacidades([capacidad]);
    const sinLicencia = contextoDePrueba();
    const sinPermiso = contextoDePrueba({ modulosActivos: ["agente"], permisos: [] });
    const autorizado = contextoDePrueba({ modulosActivos: ["agente"] });
    expect(await executeCapability(sinLicencia.ctx, capacidad.id, {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(await executeCapability(sinPermiso.ctx, capacidad.id, {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(await executeCapability(autorizado.ctx, capacidad.id, {})).toMatchObject({ ok: true });
  });
});
