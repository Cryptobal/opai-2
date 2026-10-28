import { cargoHistorico } from "./cargo-historico-ayuda";
import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

type Efectiva = {
  aplica: string;
  conceptos: { clave: string; final: unknown; origen: string | null }[];
  haberes: Record<string, number> | null;
};

describe("capas completas (07b)", () => {
  it("el RUT define toda su estructura y no toma conceptos del cargo", async () => {
    const { ctx } = contextoDePrueba();
    const cargo = await dato<{ id: string }>(ctx, "core.cargos.create", { nombre: "Supervisor" });
    await cargoHistorico(ctx, {
      cargoId: cargo.id,
      sueldoBase: 850_000,
      colacion: 45_000,
      movilizacion: 60_000,
      vigenteDesde: "2026-01-01",
    });
    const persona = await dato<{ id: string }>(ctx, "core.personas.create", {
      nombres: "José Antonio",
      apellidos: "Pérez",
      rut: "12.345.678-5",
      vinculo: { cargoId: cargo.id, tipo: "indefinido", inicio: "2026-01-05" },
    });
    expect(
      await codigo(ctx, "core.estructuras.create", {
        nivel: "persona",
        personaId: persona.id,
        motivo: "Sin conceptos",
        vigenteDesde: "2026-02-01",
      }),
    ).toBe("UNPROCESSABLE");
    await dato(ctx, "core.estructuras.create", {
      nivel: "persona",
      personaId: persona.id,
      movilizacion: 75_000,
      sueldoBase: 700_000,
      colacion: 0,
      gratificacion: "ninguna",
      motivo: "Traslado desde Talagante",
      vigenteDesde: "2026-02-01",
    });
    const e = await dato<Efectiva>(ctx, "core.estructuras.efectiva", {
      personaId: persona.id,
      fecha: "2026-03-01",
      imm: 529_000,
    });
    const de = (clave: string) => e.conceptos.find((c) => c.clave === clave);
    expect(de("movilizacion")).toMatchObject({ final: 75_000, origen: "persona" });
    expect(de("sueldoBase")).toMatchObject({ final: 700_000, origen: "persona" });
    expect(e.haberes?.["noImponible"]).toBe(75_000);
  });

  it("el nivel cargo ya no admite escrituras", async () => {
    const { ctx } = contextoDePrueba();
    const cargo = await dato<{ id: string }>(ctx, "core.cargos.create", { nombre: "Guardia" });
    expect(
      await codigo(ctx, "core.estructuras.create", {
        nivel: "cargo",
        cargoId: cargo.id,
        colacion: 45_000,
        vigenteDesde: "2026-01-01",
      }),
    ).toBe("FORBIDDEN");
  });
});
