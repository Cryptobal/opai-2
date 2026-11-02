import { describe, expect, it, vi } from "vitest";

import { validarMontosVenta, ivaDesdeNeto } from "@opai/domain";

import { consumirFolio, montosDesdeLineas } from "../src/finanzas/ventas-comun";
import type { Contexto } from "../src/types";

describe("Finanzas ventas · montos", () => {
  it("factura 33: líneas suman neto e IVA 19 %", () => {
    const m = montosDesdeLineas(33, [{ monto: 100_000 }, { monto: 50_000 }]);
    expect(m.neto).toBe(150_000);
    expect(m.iva).toBe(ivaDesdeNeto(150_000));
    expect(validarMontosVenta(33, m)).toBeNull();
  });

  it("factura 34: todo exento", () => {
    const m = montosDesdeLineas(34, [{ monto: 80_000 }]);
    expect(m).toMatchObject({ neto: 0, iva: 0, exento: 80_000, total: 80_000 });
    expect(validarMontosVenta(34, m)).toBeNull();
  });

  it("detecta total incoherente", () => {
    expect(
      validarMontosVenta(33, { neto: 100, exento: 0, iva: 19, otros: 0, total: 200 }),
    ).toMatch(/no cuadra/i);
  });
});

describe("consumirFolio", () => {
  it("reserva el folio actual con updateMany optimista", async () => {
    const rango = {
      id: "f1",
      tipoDte: 33,
      folioDesde: 100,
      folioHasta: 105,
      folioActual: 102,
      activo: true,
    };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findFirst = vi.fn().mockResolvedValue(rango);
    const tx = { dteFolio: { findFirst, updateMany } };
    const ctx = {
      tenantId: "t1",
      db: tx,
      transaccion: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    } as unknown as Contexto;

    const folio = await consumirFolio(ctx, 33, false);
    expect(folio).toBe(102);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "f1", folioActual: 102, activo: true },
      data: { folioActual: 103 },
    });
  });

  it("dryRun no incrementa", async () => {
    const updateMany = vi.fn();
    const tx = {
      dteFolio: {
        findFirst: vi.fn().mockResolvedValue({
          id: "f1",
          folioActual: 10,
          folioHasta: 20,
          activo: true,
        }),
        updateMany,
      },
    };
    const ctx = {
      transaccion: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    } as unknown as Contexto;
    await expect(consumirFolio(ctx, 33, true)).resolves.toBe(10);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("falla si updateMany no actualiza (carrera)", async () => {
    const tx = {
      dteFolio: {
        findFirst: vi.fn().mockResolvedValue({
          id: "f1",
          folioActual: 5,
          folioHasta: 10,
          activo: true,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const ctx = {
      transaccion: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    } as unknown as Contexto;
    await expect(consumirFolio(ctx, 33, false)).rejects.toMatchObject({ code: "UNPROCESSABLE" });
  });
});
