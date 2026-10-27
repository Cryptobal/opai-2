import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

const IMM = 529_000;

async function base(o: Parameters<typeof contextoDePrueba>[0] = {}) {
  const p = contextoDePrueba(o);
  const cargo = await dato<{ id: string }>(p.ctx, "core.cargos.create", { nombre: "Guardia" });
  return { ...p, cargoId: cargo.id };
}

describe("core.estructuras.*", () => {
  it("una versión nueva cierra la anterior el día previo y rechaza solapes", async () => {
    const { ctx, cargoId } = await base();
    const v1 = await dato<{ id: string }>(ctx, "core.estructuras.create", {
      nivel: "cargo",
      cargoId,
      sueldoBase: 560_000,
      vigenteDesde: "2026-01-01",
    });
    await dato(ctx, "core.estructuras.create", {
      nivel: "cargo",
      cargoId,
      sueldoBase: 600_000,
      vigenteDesde: "2026-07-01",
    });
    const lista = await dato<{ vigenteDesde: string; vigenteHasta: string | null }[]>(
      ctx,
      "core.estructuras.list",
      { nivel: "cargo", refId: cargoId },
    );
    expect(lista.map((e) => [e.vigenteDesde, e.vigenteHasta])).toEqual([
      ["2026-07-01", null],
      ["2026-01-01", "2026-06-30"],
    ]);
    expect(
      await codigo(ctx, "core.estructuras.create", {
        nivel: "cargo",
        cargoId,
        sueldoBase: 1,
        vigenteDesde: "2026-03-01",
      }),
    ).toBe("UNPROCESSABLE");
    expect(
      await codigo(ctx, "core.estructuras.create", {
        nivel: "cargo",
        puestoId: cargoId,
        sueldoBase: 1,
        vigenteDesde: "2027-01-01",
      }),
    ).toBe("UNPROCESSABLE");
    expect(
      await dato(ctx, "core.estructuras.anular", { id: v1.id, motivo: "Cargada con error" }),
    ).toMatchObject({ estado: "anulada" });
  });

  it("el RUT exige motivo, no hereda del cargo y sin capa no inventa sueldo", async () => {
    const { ctx, cargoId } = await base();
    await dato(ctx, "core.estructuras.create", {
      nivel: "cargo",
      cargoId,
      sueldoBase: 560_000,
      colacion: 45_000,
      vigenteDesde: "2026-01-01",
      items: [{ tipo: "bono_fijo", nombre: "Bono nocturno", monto: 60_000 }],
    });
    const { id: personaId } = await dato<{ id: string }>(ctx, "core.personas.create", {
      nombres: "Ana",
      apellidos: "Rojas",
      rut: "19.876.543-0",
      vinculo: { cargoId, tipo: "indefinido", inicio: "2026-02-01" },
    });
    const sinExcepcion = await dato<{ aplica: string | null; haberes: null }>(
      ctx,
      "core.estructuras.efectiva",
      { personaId, fecha: "2026-10-01", imm: IMM },
    );
    expect(sinExcepcion.aplica).toBeNull();
    expect(sinExcepcion.haberes).toBeNull();
    expect(
      await codigo(ctx, "core.estructuras.create", {
        nivel: "persona",
        personaId,
        sueldoBase: 700_000,
        vigenteDesde: "2026-09-01",
      }),
    ).toBe("UNPROCESSABLE");
    await dato(ctx, "core.estructuras.create", {
      nivel: "persona",
      personaId,
      sueldoBase: 700_000,
      vigenteDesde: "2026-09-01",
      motivo: "Acuerdo por antigüedad",
      colacion: 0, movilizacion: 0, gratificacion: "ninguna",
    });
    const r = await dato<{ aplica: string; niveles: { cargo: { sueldoBase: number } } }>(
      ctx,
      "core.estructuras.efectiva",
      { personaId, fecha: "2026-10-01" },
    );
    expect(r.aplica).toBe("persona");
    expect(r.niveles.cargo).toBeNull();
  });

  it("los montos de un cargo sensible se ocultan sin el permiso de sueldos sensibles", async () => {
    const owner = contextoDePrueba();
    const { id: cargoId } = await dato<{ id: string }>(owner.ctx, "core.cargos.create", {
      nombre: "Gerente",
      sueldoSensible: true,
    });
    await dato(owner.ctx, "core.estructuras.create", {
      nivel: "cargo",
      cargoId,
      sueldoBase: 3_000_000,
      vigenteDesde: "2026-01-01",
    });
    const visto = await dato<{ sueldoBase: number }[]>(owner.ctx, "core.estructuras.list", {
      nivel: "cargo",
      refId: cargoId,
    });
    expect(visto[0]?.sueldoBase).toBe(3_000_000);
    const sinPermiso = {
      ...owner.ctx,
      autorizar: (p: string) => p !== "core:estructuras.read_sensible",
    };
    const oculto = await dato<{ sueldoBase: null; sensible: boolean }[]>(
      sinPermiso,
      "core.estructuras.list",
      { nivel: "cargo", refId: cargoId },
    );
    expect(oculto[0]).toMatchObject({ sueldoBase: null, sensible: true });
  });

  it("la creación de una estructura sensible audita la revelación, no solo el get", async () => {
    const owner = contextoDePrueba();
    const { id: cargoId } = await dato<{ id: string }>(owner.ctx, "core.cargos.create", {
      nombre: "Gerente",
      sueldoSensible: true,
    });
    owner.eventos.length = 0;
    const creada = await dato<{ id: string; sueldoBase: number }>(owner.ctx, "core.estructuras.create", {
      nivel: "cargo",
      cargoId,
      sueldoBase: 3_000_000,
      vigenteDesde: "2026-01-01",
    });
    expect(creada.sueldoBase).toBe(3_000_000);
    const revelaciones = owner.eventos.filter((e) => e.capability === "core.estructuras.read_sensible");
    expect(revelaciones).toEqual([
      expect.objectContaining({ entityType: "estructura", entityId: creada.id }),
    ]);
    // La vista previa revela los montos anteriores de la fila persistida.
    owner.eventos.length = 0;
    await dato(
      owner.ctx,
      "core.estructuras.create",
      { nivel: "cargo", cargoId, sueldoBase: 1, vigenteDesde: "2027-01-01" },
      { dryRun: true },
    );
    expect(owner.eventos).toEqual([
      expect.objectContaining({ capability: "core.estructuras.read_sensible", entityId: creada.id }),
    ]);
  });
});

describe("core.buscar", () => {
  it("devuelve hasta 5 por tipo y solo lo que el actor puede leer", async () => {
    const { ctx } = contextoDePrueba();
    for (const n of ["Andina 1", "Andina 2", "Andina 3", "Andina 4", "Andina 5", "Andina 6"]) {
      await dato(ctx, "core.cuentas.create", { nombre: n });
    }
    await dato(ctx, "core.personas.create", {
      nombres: "Andina",
      apellidos: "Pérez",
      rut: "12.345.678-5",
    });
    const r = await dato<{ cuentas: unknown[]; personas: { href: string }[] }>(ctx, "core.buscar", {
      q: "andina",
    });
    expect(r.cuentas).toHaveLength(5);
    expect(r.personas[0]?.href).toMatch(/^\/personas\//);
    const sinPersonas = { ...ctx, autorizar: (p: string) => p !== "core:personas.read" };
    expect(
      (await dato<{ personas: unknown[] }>(sinPersonas, "core.buscar", { q: "andina" })).personas,
    ).toEqual([]);
  });
});
