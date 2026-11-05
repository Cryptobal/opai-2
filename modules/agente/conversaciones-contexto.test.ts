import { beforeEach, expect, it, vi } from "vitest";
import type { Contexto } from "@opai/capabilities";

const ejecutar = vi.fn();
vi.mock("@opai/capabilities", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  executeCapability: (...a: unknown[]) => ejecutar(...a),
}));

import { lineaContexto, revalidarContexto } from "./conversaciones-contexto";

const ID = "00000000-0000-4000-8000-0000000000cc";
const ctx = {} as Contexto;
beforeEach(() => ejecutar.mockReset());

it("lee la ficha con la capacidad de su tipo, como la persona", async () => {
  ejecutar.mockResolvedValue({ ok: true, data: {} });
  await revalidarContexto(ctx, { tipo: "instalacion", id: ID });
  expect(ejecutar).toHaveBeenCalledWith(ctx, "core.instalaciones.get", { id: ID }, {});
});

it.each(["FORBIDDEN", "NOT_FOUND", "MODULE_INACTIVE"])(
  "una ficha que la persona no puede leer (%s) responde «no existe»",
  async (code) => {
    ejecutar.mockResolvedValue({ ok: false, error: { code, message: "x" } });
    await expect(revalidarContexto(ctx, { tipo: "negocio", id: ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  },
);

it("la línea para el modelo lleva solo el tipo y el id", () => {
  expect(lineaContexto({ tipo: "cuenta", id: ID })).toContain(`cuenta ${ID}`);
});
