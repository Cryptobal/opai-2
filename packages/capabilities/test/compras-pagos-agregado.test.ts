import type { TenantTx } from "@opai/db";
import { describe, expect, it, vi } from "vitest";

import { leerProveedoresPendientes, paginarProveedoresPendientes } from "../src/finanzas/compras-pagos-agregado";

const punto = (proveedorId: string, razonSocial: string, saldoPorPagar: number) => ({
  proveedorId, razonSocial, rut: "ficticio", documentosConSaldo: 1, saldoPorPagar, saldoVencido: 0,
});

describe("pagos a proveedores agregados", () => {
  it("liga filtros y empresa, mantiene estado de conciliación y compara fecha de calendario", async () => {
    const $queryRaw = vi.fn(async (_sql: unknown) => [{
      ...punto("a", "Proveedor ficticio", 1), documentosConSaldo: 2n,
      saldoPorPagar: "70", saldoVencido: "20",
    }]);
    const tx = { $queryRaw } as unknown as TenantTx;
    const filas = await leerProveedoresPendientes(tx, "tenant-ficticio", "2026-11-20", "A._%");
    expect(filas[0]).toMatchObject({ documentosConSaldo: 2, saldoPorPagar: 70, saldoVencido: 20 });
    expect($queryRaw).toHaveBeenCalledOnce();
    const p = $queryRaw.mock.calls[0]?.[0];
    expect(p).toMatchObject({ values: ["tenant-ficticio", "%A._%%", "%A._%%", "%A_%%", "2026-11-20"] });
    const sql = String((p as { text: string }).text);
    expect(sql).toContain("p.tenant_id = d.tenant_id");
    expect(sql).toContain("cb.tenant_id = d.tenant_id");
    expect(sql).toContain("cb.activa AND cb.confirmada");
    expect(sql).toContain("fecha_emision + plazo_pago_dias <");
    expect(sql).not.toContain("A._%");
  });

  it("conserva localeCompare y cursor/total sin truncar el agregado", () => {
    const filas = [punto("3", "Beta", 20), punto("2", "Álamo", 20), punto("1", "Zeta", 50)];
    const primera = paginarProveedoresPendientes(filas, 1);
    const segunda = paginarProveedoresPendientes(filas, 1, primera.siguiente ?? undefined);
    const tercera = paginarProveedoresPendientes(filas, 1, segunda.siguiente ?? undefined);
    expect([primera.items[0]?.proveedorId, segunda.items[0]?.proveedorId, tercera.items[0]?.proveedorId])
      .toEqual(["1", "2", "3"]);
    expect(tercera.siguiente).toBeNull();
    expect(segunda.totalPorPagar).toBe(90);
    expect(paginarProveedoresPendientes(filas, 1, "ausente")).toEqual(primera);
  });

  it("no entrega totales redondeados si exceden rango seguro del contrato numérico", () => {
    expect(() => paginarProveedoresPendientes([
      punto("a", "A", Number.MAX_SAFE_INTEGER), punto("b", "B", 1),
    ], 1)).toThrow("fuera del rango seguro");
  });
});
