import { beforeEach, expect, it, vi } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { iaElegidaDelAgente, modelosDelAgente } from "../src/integraciones/ia-modelos";

const dobles = vi.hoisted(() => ({ candidatos: vi.fn(), ia: vi.fn() }));
vi.mock("../src/integraciones/ia-candidatos", () => ({ candidatosIa: dobles.candidatos }));
vi.mock("../src/integraciones/ia", () => ({ iaDe: dobles.ia }));
beforeEach(() => {
  dobles.candidatos.mockResolvedValue({
    cands: [{ id: "ia_openai", modelo: "conectado", cred: { valor: "credencial-ficticia" } }],
  });
  dobles.ia.mockResolvedValue({ modelo: "conectado" });
});
it("publica solo proveedor/modelo/clase, nunca la credencial del candidato", async () => {
  const { ctx } = contextoDePrueba();
  const modelos = await modelosDelAgente(ctx);
  expect(modelos).toHaveLength(3);
  expect(JSON.stringify(modelos)).not.toContain("credencial");
  expect(
    await iaElegidaDelAgente(ctx, {
      proveedor: "ia_openai",
      modelo: "conectado",
      clase: "estandar",
    }),
  ).toMatchObject({ modelo: "conectado" });
});
it("rechaza modelos inventados, proveedores no conectados y cambios entre validación y resolución", async () => {
  const { ctx } = contextoDePrueba();
  await expect(
    iaElegidaDelAgente(ctx, { proveedor: "ia_openai", modelo: "inventado", clase: "estandar" }),
  ).rejects.toThrow(/no disponible/);
  dobles.candidatos.mockResolvedValue({ cands: [] });
  await expect(
    iaElegidaDelAgente(ctx, { proveedor: "ia_google", modelo: "conectado", clase: "estandar" }),
  ).rejects.toThrow(/no disponible/);
  dobles.candidatos.mockResolvedValue({ cands: [{ id: "ia_openai", modelo: "conectado" }] });
  dobles.ia.mockResolvedValue({ modelo: "cambió" });
  await expect(
    iaElegidaDelAgente(ctx, { proveedor: "ia_openai", modelo: "conectado", clase: "estandar" }),
  ).rejects.toThrow(/no disponible/);
});
