import { describe, expect, it, vi } from "vitest";

import { LimpiezaComprasQaError, prepararComprasQa } from "./compras-qa-etapas";

describe("diagnósticos del fixture de compras", () => {
  it("retiene ambas etapas sin conservar los errores originales", async () => {
    const entrada = "detalle-original-ficticio";
    const preparar = prepararComprasQa(async (etapa) => {
      etapa("clonar plantilla");
      throw Object.assign(new Error(entrada), { input: entrada });
    }, async () => {
      throw new LimpiezaComprasQaError(["cerrar el catálogo"]);
    });
    const error = await preparar.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AggregateError);
    const ambos = error as AggregateError;
    expect(ambos.errors.map((e: Error) => e.message)).toEqual([
      "Preparar fixture de compras: clonar plantilla.",
      "Limpieza fixture de compras: cerrar el catálogo.",
    ]);
    expect(ambos.errors.every((e: Error) => !("input" in e) && !("cause" in e))).toBe(true);
  });

  it("ejecuta limpieza una vez al fallar la validación", async () => {
    const limpiar = vi.fn(async () => {});
    await expect(prepararComprasQa(async () => {
      throw new Error("detalle-original-ficticio");
    }, limpiar)).rejects.toThrow("Preparar fixture de compras: validar destino.");
    expect(limpiar).toHaveBeenCalledTimes(1);
  });
});
