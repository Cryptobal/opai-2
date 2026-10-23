import { describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { DESCRIPCION_MINIMA, defineCapability } from "../src/define";

const base = {
  id: "demo.nota.leer",
  permiso: null,
  input: z.object({}),
  output: z.object({}),
  efecto: "lectura" as const,
  dryRun: false,
  handler: async () => ({}),
};

const conLargo = (n: number) => "x".repeat(n);

describe("defineCapability: descripción como contrato (ADR-034)", () => {
  it("rechaza una descripción de 39 caracteres", () => {
    expect(() => defineCapability({ ...base, descripcion: conLargo(39) })).toThrow(/ADR-034/);
  });

  it("rechaza una descripción que solo llega al mínimo con espacios", () => {
    const relleno = `${conLargo(20)}${" ".repeat(30)}`;
    expect(() => defineCapability({ ...base, descripcion: relleno })).toThrow(/tiene 20/);
  });

  it("acepta una descripción de 40 caracteres", () => {
    const cap = defineCapability({ ...base, descripcion: conLargo(DESCRIPCION_MINIMA) });
    expect(cap.modulo).toBe("demo");
  });

  it("mantiene el rechazo de una escritura sin dryRun", () => {
    expect(() =>
      defineCapability({
        ...base,
        descripcion: "Escribe una nota de prueba sin vista previa.",
        efecto: "escritura",
      }),
    ).toThrow(/dryRun/);
  });

  it("todas las capacidades del núcleo cumplen el mínimo", () => {
    const cortas = capacidadesDelNucleo
      .filter((c) => c.descripcion.trim().length < DESCRIPCION_MINIMA)
      .map((c) => c.id);
    expect(cortas).toEqual([]);
    expect(capacidadesDelNucleo.length).toBeGreaterThan(0);
  });
});
