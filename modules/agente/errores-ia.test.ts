import { expect, it } from "vitest";
import { ErrorCapacidad, ErrorRespaldoIa } from "@opai/capabilities";
import { ErrorIa } from "@opai/integrations";

import { conErroresIa } from "./errores-ia";

const privado = "contenido privado, token y datos del proveedor: no revelar";
const fallar = (error: unknown) =>
  conErroresIa(async () => {
    throw error;
  });

it.each([
  [400, "rechazó la solicitud"],
  [401, "rechazó la credencial"],
  [402, "facturación"],
  [403, "denegó el acceso"],
  [404, "recurso de IA"],
  [422, "rechazó la solicitud"],
  [429, "límite de uso"],
  [500, "temporalmente"],
  [503, "temporalmente"],
  [null, "comunicación"],
] as const)("clasifica HTTP %s sin revelar detalles externos", async (estado, texto) => {
  const error = await fallar(new ErrorIa(privado, estado, privado)).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorCapacidad);
  expect(error).toMatchObject({ code: "UNPROCESSABLE", message: expect.stringContaining(texto) });
  expect(String(error)).not.toContain(privado);
  expect(JSON.stringify(error)).not.toContain(privado);
});

it("un 400 no se interpreta como saldo insuficiente", async () => {
  await expect(fallar(new ErrorIa("simulado", 400, "saldo insuficiente"))).rejects.toMatchObject({
    message: expect.not.stringMatching(/saldo|facturación/),
  });
});

it("clasifica la causa de BYOK y no ejecuta otro intento", async () => {
  let intentos = 0;
  await expect(
    conErroresIa(async () => {
      intentos++;
      throw new ErrorRespaldoIa(["ia_anthropic"], new ErrorIa(privado, 429, privado));
    }),
  ).rejects.toMatchObject({
    code: "UNPROCESSABLE",
    message: expect.stringContaining("límite de uso"),
  });
  expect(intentos).toBe(1);
});

it("la configuración BYOK inutilizable tiene una indicación propia", async () => {
  await expect(fallar(new ErrorRespaldoIa(["ia_anthropic"], undefined))).rejects.toMatchObject({
    code: "UNPROCESSABLE",
    message: expect.stringContaining("credencial y el modelo"),
  });
});

it.each([
  new ErrorCapacidad("FORBIDDEN", "Sin acceso"),
  new ErrorCapacidad("BUDGET_EXCEEDED", "Sin presupuesto"),
  new Error("Error inesperado"),
  { estado: 401, message: privado },
])("conserva por identidad los errores ajenos al proveedor", async (error) => {
  await expect(fallar(error)).rejects.toBe(error);
});

it("devuelve la respuesta sin alterarla", async () => {
  const respuesta = { texto: "respuesta sintética" };
  expect(await conErroresIa(async () => respuesta)).toBe(respuesta);
});
