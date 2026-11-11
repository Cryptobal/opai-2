// CAR-240: `core.integraciones.set_secreto` no guarda la API key de SimpleAPI sin guiones (SimpleAPI la rechaza con
// 401). Keys ficticias; nada sale a la red.
import { randomBytes } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo, executeCapability, limpiarRegistro, registrarCapacidades } from "../src";
import { contextoDePrueba } from "../src/testing";

const SIN_GUIONES = "AB12CD34EF56GH78IJ90";
const CON_GUIONES = "AB12-CD34-EF56-GH78-IJ90";

beforeAll(() => {
  process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
});
beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const guardar = (ctx: ReturnType<typeof contextoDePrueba>["ctx"], valor: string, dryRun = false) =>
  executeCapability(ctx, "core.integraciones.set_secreto", { proveedor: "dte_emision", nombre: "api_key", valor }, { dryRun });

describe("core.integraciones.set_secreto · formato de la key de SimpleAPI (CAR-240)", () => {
  it("rechaza la key de 20 caracteres sin guiones, también en vista previa, sin guardar nada", async () => {
    const { ctx } = contextoDePrueba();
    for (const dryRun of [true, false]) {
      const r = await guardar(ctx, SIN_GUIONES, dryRun);
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect(r.error.code).toBe("UNPROCESSABLE");
      expect(r.error.message).toContain("XXXX-XXXX-XXXX-XXXX-XXXX");
      expect(r.error.message).not.toContain(SIN_GUIONES);
    }
    const get = await executeCapability(ctx, "core.integraciones.get", { proveedor: "dte_emision" });
    expect(get.ok).toBe(true);
    if (!get.ok) return;
    const secretos = (get.data as { secretos: { nombre: string; mascara: string | null }[] }).secretos;
    expect(secretos.find((s) => s.nombre === "api_key")?.mascara ?? null).toBeNull();
  });

  it("guarda la key con guiones", async () => {
    const { ctx } = contextoDePrueba();
    const r = await guardar(ctx, CON_GUIONES);
    expect(r.ok).toBe(true);
  });
});
