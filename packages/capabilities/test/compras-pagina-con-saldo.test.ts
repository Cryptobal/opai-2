import { describe, expect, it, vi } from "vitest";

import { calcularPaginaConSaldo, TAMANO_TRAMO_COMPRAS } from "../src/finanzas/compras-pagina-con-saldo";

const compra = (id: string, montoTotal = 5, tipoDte = 33) => ({ id, montoTotal, tipoDte });
function fuente(filas: ReturnType<typeof compra>[], pagos: ReadonlyMap<string, number>) {
  const buscar = vi.fn(async (cursor: string | undefined) => {
    const inicio = cursor ? filas.findIndex((d) => d.id === cursor) + 1 : 0;
    return filas.slice(inicio, inicio + TAMANO_TRAMO_COMPRAS);
  });
  const pagado = vi.fn(async (_ids: string[]) => pagos);
  return { buscar, pagado };
}

describe("página de compras con saldo", () => {
  it("incluye parcial y pendiente, excluye crédito, cero y liquidada", async () => {
    const { buscar, pagado } = fuente([
      compra("parcial", 100), compra("credito", 100, 61), compra("cero", 0),
      compra("liquidada", 100), compra("pendiente", 100),
    ], new Map([["parcial", 40], ["liquidada", 100]]));
    const r = await calcularPaginaConSaldo(10, undefined, buscar, pagado);
    expect(r.items.map((d) => d.id)).toEqual(["parcial", "pendiente"]);
    expect(r.siguiente).toBeNull();
    expect(pagado).toHaveBeenCalledWith(["parcial", "liquidada", "pendiente"]);
  });

  it("evita duplicados al cambiar de tramo y reanuda después del cursor de página", async () => {
    const liquidadas = Array.from({ length: 49 }, (_, i) => compra(`pagada-${i}`));
    const { buscar, pagado } = fuente([
      ...liquidadas, compra("primera"), compra("segunda"), compra("tercera"),
    ], new Map(liquidadas.map((d) => [d.id, d.montoTotal])));
    const primera = await calcularPaginaConSaldo(2, undefined, buscar, pagado);
    const segunda = await calcularPaginaConSaldo(2, primera.siguiente ?? undefined, buscar, pagado);
    expect(primera.items.map((d) => d.id)).toEqual(["primera", "segunda"]);
    expect(primera.siguiente).toBe("segunda");
    expect(segunda.items.map((d) => d.id)).toEqual(["tercera"]);
    expect(buscar.mock.calls).toEqual([[undefined], ["primera"], ["segunda"]]);
    expect(pagado.mock.calls.every(([ids]) => ids.length <= TAMANO_TRAMO_COMPRAS)).toBe(true);
  });

  it("no escanea el resto de un libro voluminoso si llenó la página", async () => {
    const filas = Array.from({ length: 10_000 }, (_, i) => compra(`compra-${i}`));
    const { buscar, pagado } = fuente(filas, new Map());
    const r = await calcularPaginaConSaldo(10, undefined, buscar, pagado);
    expect(r.items).toHaveLength(10);
    expect(r.siguiente).toBe("compra-9");
    expect(buscar).toHaveBeenCalledOnce();
    expect(pagado).toHaveBeenCalledOnce();
  });
});
