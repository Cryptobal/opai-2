import { describe, expect, it, vi } from "vitest";

import {
  consumirFolio,
  folioVista,
  marcarBorradorEmitido,
} from "../src/finanzas/ventas-comun";
import type { Contexto } from "../src/types";

describe("consumirFolio", () => {
  it("reserva el folio actual con updateMany optimista", async () => {
    const rango = {
      id: "f1",
      tipoDte: 33,
      folioDesde: 100,
      folioHasta: 105,
      folioActual: 102,
      activo: true,
      cafAmbiente: "certificacion",
      cafVenceEn: new Date("2027-12-31T00:00:00.000Z"),
    };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findMany = vi.fn().mockResolvedValue([rango]);
    const tx = { dteConfig: { findUnique: async () => null },
      dteFolio: { findMany, updateMany } };
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
      dteConfig: { findUnique: async () => null },
      dteFolio: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "f1",
            folioActual: 10,
            folioHasta: 20,
            activo: true,
            cafAmbiente: "certificacion",
            cafVenceEn: new Date("2027-12-31T00:00:00.000Z"),
          },
        ]),
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
      dteConfig: { findUnique: async () => null },
      dteFolio: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "f1",
            folioActual: 5,
            folioHasta: 10,
            activo: true,
            cafAmbiente: "certificacion",
            cafVenceEn: new Date("2027-12-31T00:00:00.000Z"),
          },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const ctx = {
      transaccion: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    } as unknown as Contexto;
    await expect(consumirFolio(ctx, 33, false)).rejects.toMatchObject({ code: "UNPROCESSABLE" });
  });

  it("rechaza CAF vencido si no hay otro rango", async () => {
    const tx = {
      dteConfig: { findUnique: async () => null },
      dteFolio: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "f1",
            folioActual: 5,
            folioHasta: 10,
            activo: true,
            cafAmbiente: "certificacion",
            cafVenceEn: new Date("2020-01-01T00:00:00.000Z"),
          },
        ]),
        updateMany: vi.fn(),
      },
    };
    const ctx = {
      transaccion: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    } as unknown as Contexto;
    await expect(consumirFolio(ctx, 33, false)).rejects.toMatchObject({ code: "UNPROCESSABLE" });
  });

  it("N15: salta un rango con CAF vencido y usa el siguiente", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      dteConfig: { findUnique: async () => null },
      dteFolio: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "viejo",
            folioActual: 10,
            folioHasta: 20,
            activo: true,
            cafAmbiente: "certificacion",
            cafVenceEn: new Date("2020-01-01T00:00:00.000Z"),
          },
          {
            id: "nuevo",
            folioActual: 8000,
            folioHasta: 8010,
            activo: true,
            cafAmbiente: "certificacion",
            cafVenceEn: new Date("2027-12-31T00:00:00.000Z"),
          },
        ]),
        updateMany,
      },
    };
    const ctx = {
      transaccion: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    } as unknown as Contexto;
    await expect(consumirFolio(ctx, 33, false)).resolves.toBe(8000);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "nuevo", folioActual: 8000, activo: true },
      data: { folioActual: 8001 },
    });
  });

  it("en simulado no consume un rango de ambiente sin determinar (podría ser de producción; CAR-240)", async () => {
    const updateMany = vi.fn();
    const tx = {
      dteConfig: { findUnique: async () => null },
      dteFolio: {
        findMany: vi.fn().mockResolvedValue([
          { id: "f9", folioDesde: 1, folioActual: 1, folioHasta: 9, activo: true, cafVenceEn: null, cafIdk: null },
        ]),
        updateMany,
      },
    };
    const ctx = { transaccion: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx) } as unknown as Contexto;
    await expect(consumirFolio(ctx, 33, false)).rejects.toThrow(/No hay un CAF activo de certificación/);
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("folioVista · avisos R-FIN-038", () => {
  it("marca folios bajos y CAF por vencer", () => {
    const v = folioVista(
      {
        id: "x",
        tipoDte: 33,
        folioDesde: 1,
        folioHasta: 100,
        folioActual: 85,
        cafVenceEn: new Date("2026-01-20T00:00:00.000Z"),
        umbralAviso: 20,
        activo: true,
      },
      { umbralFoliosPct: 20, avisoCafDias: 30, hoyIso: "2026-01-01" },
    );
    expect(v.alertaFoliosBajos).toBe(true);
    expect(v.alertaCafPorVencer).toBe(true);
    expect(v.alerta).toBe(true);
  });
});

describe("marcarBorradorEmitido · concurrencia", () => {
  it("exige borrador sin folio (count 1)", async () => {
    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const tx = { documentoEmitido: { updateMany } };
    await marcarBorradorEmitido(tx as never, "doc-1", {
      folio: 10,
      fechaEmision: new Date("2026-01-01"),
      timbrePdf417: "t",
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "doc-1", estadoDte: "borrador", folio: null },
      data: expect.objectContaining({ folio: 10, estadoDte: "enviado" }),
    });
    await expect(
      marcarBorradorEmitido(tx as never, "doc-1", {
        folio: 11,
        fechaEmision: new Date("2026-01-01"),
        timbrePdf417: "t",
      }),
    ).rejects.toMatchObject({ code: "UNPROCESSABLE" });
  });

  it("simula dos emisiones simultáneas: solo una gana", async () => {
    let emitidos = 0;
    const updateMany = vi.fn(async () => {
      if (emitidos === 0) {
        emitidos += 1;
        return { count: 1 };
      }
      return { count: 0 };
    });
    const tx = { documentoEmitido: { updateMany } };
    const data = { folio: 1, fechaEmision: new Date(), timbrePdf417: "x" };
    const r = await Promise.allSettled([
      marcarBorradorEmitido(tx as never, "doc", data),
      marcarBorradorEmitido(tx as never, "doc", data),
    ]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(r.filter((x) => x.status === "rejected")).toHaveLength(1);
  });
});
